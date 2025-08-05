import { useEffect, useRef, useCallback } from 'react';
import { useMap } from 'react-leaflet';
import type L from 'leaflet';

interface MapResizeOptions {
    debounceMs?: number;
}

/**
 * Hook for automatic map resizing using ResizeObserver
 * Must be used inside MapContainer
 */
export const useMapResize = ({
                                 debounceMs = 50,
                             }: MapResizeOptions = {}) => {
    const map = useMap();
    const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Automatic resize detection with ResizeObserver
    useEffect(() => {
        const handleResize = () => {
            if (resizeTimeoutRef.current) {
                clearTimeout(resizeTimeoutRef.current);
            }

            resizeTimeoutRef.current = setTimeout(() => {
                if (map) {
                    map.invalidateSize();
                }
            }, debounceMs);
        };

        const resizeObserver = new ResizeObserver(handleResize);
        const mapContainer = map.getContainer().parentElement;

        if (mapContainer) {
            resizeObserver.observe(mapContainer);
        }

        return () => {
            if (resizeTimeoutRef.current) {
                clearTimeout(resizeTimeoutRef.current);
            }
            resizeObserver.disconnect();
        };
    }, [map, debounceMs]);

    return null;
};

/**
 * Hook for animated map resizing - can be used anywhere
 * Does NOT require MapContainer context
 */
export const useAnimatedMapResize = (options: {
    animationDuration?: number;
    updateInterval?: number;
} = {}) => {
    const { animationDuration = 300, updateInterval = 16 } = options;
    const activeAnimationRef = useRef<NodeJS.Timeout | null>(null);

    const animateResize = useCallback((mapRef: React.RefObject<L.Map | null>) => {
        // Clear any existing animation
        if (activeAnimationRef.current) {
            clearInterval(activeAnimationRef.current);
        }

        // Start map resize immediately - check for null
        if (mapRef.current) {
            mapRef.current.invalidateSize();
        }

        // Continue updating during transition
        const totalSteps = Math.ceil(animationDuration / updateInterval);
        let currentStep = 0;

        activeAnimationRef.current = setInterval(() => {
            // Check for null on each iteration
            if (mapRef.current) {
                mapRef.current.invalidateSize();
            }

            currentStep++;
            if (currentStep >= totalSteps) {
                if (activeAnimationRef.current) {
                    clearInterval(activeAnimationRef.current);
                    activeAnimationRef.current = null;
                }
            }
        }, updateInterval);
    }, [animationDuration, updateInterval]);

    // Cleanup function
    const cleanup = useCallback(() => {
        if (activeAnimationRef.current) {
            clearInterval(activeAnimationRef.current);
            activeAnimationRef.current = null;
        }
    }, []);

    return { animateResize, cleanup };
};

// Simple component wrapper for the automatic resize functionality
export const MapResizeHandler: React.FC<{ debounceMs?: number }> = ({
                                                                        debounceMs = 50
                                                                    }) => {
    useMapResize({ debounceMs });
    return null;
};