import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { useMapStore, usePointLayerStore, useHazardLayersStore } from '../stores';
import {
    serializeMapConfigs,
    deserializeMapConfigs,
    validateAndNormalize,
} from '../utils/urlSerializer';
import { initializeStoresFromUrl } from '../utils/storeInitializer';

/**
 * Hook that provides bidirectional sync between Zustand stores and URL parameters
 *
 * Store > URL: Updates URL when store state changes
 * URL > Store: Handles browser back/forward navigation
 *
 */
export function useUrlSync(isInitialized: boolean) {
    const [searchParams, setSearchParams] = useSearchParams();

    // Track URL update to prevent circular updates
    const isUpdatingFromUrl = useRef(false);

    const mapConfigs = useMapStore(useShallow((state) => state.mapConfigs));
    const visiblePointLayers = usePointLayerStore((state) => state.visibleLayerIds);
    const visibleHazardLayers = useHazardLayersStore((state) => state.visibleLayerIds);

    // --- STORE > URL SYNC ---

    // Sync map configs
    useEffect(() => {
        if (!isInitialized || isUpdatingFromUrl.current) return;

        const serialized = serializeMapConfigs(mapConfigs);

        setSearchParams((prev) => {
            const newParams = new URLSearchParams(prev);

            newParams.set('maps', serialized.maps);

            // Update datasets - remove old ones first
            Array.from(prev.keys()).forEach((key) => {
                if (key.startsWith('d_')) newParams.delete(key);
            });
            Object.entries(serialized.datasets).forEach(([key, val]) => {
                newParams.set(key, val);
            });

            // Update metrics - remove old ones first
            Array.from(prev.keys()).forEach((key) => {
                if (key.startsWith('m_')) newParams.delete(key);
            });
            Object.entries(serialized.metrics).forEach(([key, val]) => {
                newParams.set(key, val);
            });

            return newParams;
        }, { replace: true });
    },
        // Dependency: serialize map config state for comparison
        [
        mapConfigs.map((c) => `${c.id}:${c.dataset}:${c.metric}:${c.visible}`).join('|'),
        setSearchParams,
        isInitialized,
    ]);

    // Sync point layer visibility
    useEffect(() => {
        if (!isInitialized || isUpdatingFromUrl.current) return;

        setSearchParams((prev) => {
            const newParams = new URLSearchParams(prev);

            if (visiblePointLayers.size > 0) {
                newParams.set('layers', Array.from(visiblePointLayers).sort().join(','));
            } else {
                newParams.delete('layers');
            }

            return newParams;
        }, { replace: true });
    },
        // Dependency: sorted layer IDs as string
        [
        Array.from(visiblePointLayers).sort().join(','),
        setSearchParams,
        isInitialized,
    ]);

    // Sync hazard layer visibility
    useEffect(() => {
        if (!isInitialized || isUpdatingFromUrl.current) return;

        setSearchParams((prev) => {
            const newParams = new URLSearchParams(prev);

            if (visibleHazardLayers.size > 0) {
                newParams.set('hazards', Array.from(visibleHazardLayers).sort().join(','));
            } else {
                newParams.delete('hazards');
            }

            return newParams;
        }, { replace: true });
    },
        // Dependency: sorted layer IDs as string
        [
        Array.from(visibleHazardLayers).sort().join(','),
        setSearchParams,
        isInitialized,
    ]);

    // --- URL > STORE SYNC ---

    // Handle browser back/forward navigation
    useEffect(() => {
        const handlePopState = () => {
            isUpdatingFromUrl.current = true;

            try {
                const params = new URLSearchParams(window.location.search);
                const urlState = deserializeMapConfigs(params);
                const validatedState = validateAndNormalize(urlState);
                initializeStoresFromUrl(validatedState);
            } catch (error) {
                console.error('Failed to restore state from URL navigation:', error);
            } finally {
                setTimeout(() => {
                    isUpdatingFromUrl.current = false;
                }, 100);
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);
}