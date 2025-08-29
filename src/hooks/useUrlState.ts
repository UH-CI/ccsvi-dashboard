import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface UrlState {
    dataset: string;
    metric: string;
    pointLayers: string[];
    lat?: number;
    lng?: number;
    zoom?: number;
}

const DEFAULT_STATE: UrlState = {
    dataset: '',
    metric: '',
    pointLayers: [],
};

export const useUrlState = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Parse current URL state
    const urlState: UrlState = useMemo(() => {
        const layersParam = searchParams.get('layers');
        const pointLayers = layersParam
            ? layersParam.split(',').filter(Boolean).sort()
            : DEFAULT_STATE.pointLayers;

        const state = {
            dataset: searchParams.get('dataset') || DEFAULT_STATE.dataset,
            metric: searchParams.get('metric') || DEFAULT_STATE.metric,
            pointLayers,
            lat: searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : undefined,
            lng: searchParams.get('lng') ? parseFloat(searchParams.get('lng')!) : undefined,
            zoom: searchParams.get('zoom') ? parseInt(searchParams.get('zoom')!) : undefined,
        };

        console.log('URL State parsed:', state);
        return state;
    }, [searchParams]);

    // Update URL state with debouncing for map position
    const updateUrlState = useCallback((updates: Partial<UrlState>) => {
        console.log('updateUrlState called with:', updates);

        // Clear any pending timeout for map position updates
        if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
        }

        // Check if this is a map position update (should be debounced)
        const isMapUpdate = 'lat' in updates || 'lng' in updates || 'zoom' in updates;

        const performUpdate = () => {
            setSearchParams(prev => {
                const newParams = new URLSearchParams(prev);

                // Handle dataset
                if ('dataset' in updates) {
                    if (updates.dataset) {
                        newParams.set('dataset', updates.dataset);
                    } else {
                        newParams.delete('dataset');
                    }
                }

                // Handle metric
                if ('metric' in updates) {
                    if (updates.metric) {
                        newParams.set('metric', updates.metric);
                    } else {
                        newParams.delete('metric');
                    }
                }

                // Handle point layers
                if ('pointLayers' in updates) {
                    const newLayers = updates.pointLayers || [];
                    if (newLayers.length > 0) {
                        // Sort to ensure consistent URL format
                        const sortedLayers = [...newLayers].sort();
                        newParams.set('layers', sortedLayers.join(','));
                    } else {
                        newParams.delete('layers');
                    }
                }

                // Handle map position (all three must be present)
                if ('lat' in updates && 'lng' in updates && 'zoom' in updates) {
                    if (updates.lat !== undefined && updates.lng !== undefined && updates.zoom !== undefined) {
                        newParams.set('lat', updates.lat.toFixed(4));
                        newParams.set('lng', updates.lng.toFixed(4));
                        newParams.set('zoom', updates.zoom.toString());
                    }
                }

                console.log('New URL params:', newParams.toString());
                return newParams;
            }, { replace: isMapUpdate }); // Replace for map updates to avoid cluttering history
        };

        if (isMapUpdate) {
            // Debounce map position updates to avoid excessive URL changes
            updateTimeoutRef.current = setTimeout(performUpdate, 500);
        } else {
            // Immediate update for user interactions (dataset, metric, layers)
            performUpdate();
        }
    }, [setSearchParams]);

    // Clear all URL state
    const clearUrlState = useCallback(() => {
        setSearchParams({});
    }, [setSearchParams]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current);
            }
        };
    }, []);

    return {
        urlState,
        updateUrlState,
        clearUrlState,
    };
};