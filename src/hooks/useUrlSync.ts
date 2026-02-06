import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import { useMapStore, usePointLayerStore, useHazardLayersStore, useRasterLayersStore } from '../stores';
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
    const [, setSearchParams] = useSearchParams();

    // Track URL update to prevent circular updates
    const isUpdatingFromUrl = useRef(false);

    const mapConfigs = useMapStore(useShallow((state) => state.mapConfigs));
    const primaryMapId = useMapStore((state) => state.primaryMapId);
    const visiblePointLayersByMap = usePointLayerStore((state) => state.visibleLayerIdsByMap);
    const visibleHazardLayers = useHazardLayersStore((state) => state.visibleLayerIds);
    const visibleRasterLayers = useRasterLayersStore((state) => state.visibleLayerIds);

    // --- STORE > URL SYNC ---

    const mapConfigKey = mapConfigs.map((c) => `${c.id}:${c.dataset}:${c.metric}:${c.visible}:${c.activeFeature?.geoid ?? ''}`).join('|');
    const pointLayerKey = Object.entries(visiblePointLayersByMap).flatMap(([mapId, layers]) => Array.from(layers).map((layerId) => `${mapId}:${layerId}`)).sort().join(',');
    const hazardLayerKey = Array.from(visibleHazardLayers).sort().join(',');
    const rasterLayerKey = Array.from(visibleRasterLayers).sort().join(',');

    useEffect(() => {
        if (!isInitialized || isUpdatingFromUrl.current) return;

        const isDefaultMapState = mapConfigs.length === 1
            && !mapConfigs[0].dataset
            && !mapConfigs[0].metric;

        const serialized = serializeMapConfigs(mapConfigs);

        setSearchParams((prev) => {
            const newParams = new URLSearchParams(prev);

            // --- Map configs ---
            Array.from(prev.keys()).forEach((key) => {
                if (key.startsWith('d_') || key.startsWith('m_') || key.startsWith('af_')) newParams.delete(key);
            });

            if (isDefaultMapState) {
                newParams.delete('maps');
            } else {
                newParams.set('maps', serialized.maps);

                Object.entries(serialized.datasets).forEach(([key, val]) => {
                    newParams.set(key, val);
                });
                Object.entries(serialized.metrics).forEach(([key, val]) => {
                    newParams.set(key, val);
                });
                Object.entries(serialized.activeFeatures).forEach(([key, val]) => {
                    newParams.set(key, val);
                });
            }

            // --- Point layers ---
            const serializedPointLayers = Object.entries(visiblePointLayersByMap)
                .flatMap(([mapId, layers]) =>
                    Array.from(layers).map((layerId) => `${mapId}:${layerId}`)
                );

            if(serializedPointLayers.length > 0) {
                newParams.set('layers', serializedPointLayers.sort().join(','));
            } else {
                newParams.delete('layers');
            }

            // --- Hazard layers ---
            if (visibleHazardLayers.size > 0) {
                newParams.set('hazards', Array.from(visibleHazardLayers).sort().join(','));
            } else {
                newParams.delete('hazards');
            }

            // --- Raster layers ---
            if (visibleRasterLayers.size > 0) {
                newParams.set('rasters', Array.from(visibleRasterLayers).sort().join(','));
            } else {
                newParams.delete('rasters');
            }

            // --- Active map ---
            if (!isDefaultMapState && primaryMapId) {
                newParams.set('active', primaryMapId);
            } else {
                newParams.delete('active');
            }

            return newParams;
        }, { replace: true });
    }, [mapConfigKey, primaryMapId, pointLayerKey, hazardLayerKey, rasterLayerKey, setSearchParams, isInitialized]);

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