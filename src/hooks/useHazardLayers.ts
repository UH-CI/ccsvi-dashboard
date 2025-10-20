import { useMemo } from 'react';
import { useDataFetcher } from './useDataFetcher';
import { HazardLayerConfig, SubHazardLayerConfig, SubHazardLayerGroup } from '../types';
import { DATASETS_CONFIG } from '../config';
import { FeatureCollection, Geometry } from 'geojson';

export interface HazardLayerWithSubs extends HazardLayerConfig {
    subLayers: SubHazardLayerConfig[];
}

export interface UseHazardLayersReturn {
    hazardLayers: HazardLayerWithSubs[];
    isInitialized: boolean;
    loading: boolean;
    error: string | null;
}

export const useHazardLayers = (visibleHazardLayers: string[]): UseHazardLayersReturn => {
    // Load hazard data
    const hazardData = useDataFetcher<{ hazardLayers: HazardLayerConfig[] }>(
        DATASETS_CONFIG.hazardDatasetPath,
        { errorPrefix: 'Failed to load hazard data' }
    );

    const hazardSubData = useDataFetcher<{ subHazardLayers: SubHazardLayerGroup[] }>(
        DATASETS_CONFIG.hazardChildrenPath,
        { errorPrefix: 'Failed to load sub-hazard data' }
    );

    // Combine hazard data with sub-layers and apply visibility state
    const hazardLayers = useMemo(() => {
        if (!hazardData.data?.hazardLayers || !hazardSubData.data?.subHazardLayers) {
            return [];
        }

        return hazardData.data.hazardLayers.map(hazard => {
            const subGroup = hazardSubData.data!.subHazardLayers.find(s => s.id === hazard.id);
            const subLayers = (subGroup?.subLayers ?? []).map(sub => ({
                ...sub,
                visible: visibleHazardLayers.includes(sub.id)
            }));

            return {
                ...hazard,
                visible: visibleHazardLayers.includes(hazard.id),
                subLayers
            };
        });
    }, [hazardData.data, hazardSubData.data, visibleHazardLayers]);

    return {
        hazardLayers,
        isInitialized: hazardData.loaded && hazardSubData.loaded,
        loading: hazardData.loading || hazardSubData.loading,
        error: hazardData.error || hazardSubData.error
    };
};
