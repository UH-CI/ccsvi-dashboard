import { useMemo } from 'react';
import { BlockGroupProperties, HawaiianHomelandProperties, Dataset } from '../types';
import { polygonLayerConfigs } from '../config';
import { usePolygonLayer } from './usePolygonLayer';

export const useBlockGroupPolygonLayers = (
    dataset: Dataset | null,
    activeDataset: string | undefined
) => {
    const shouldLoadHawaiianHomelands = useMemo(() => {
        if (!dataset || !activeDataset) return false;
        return dataset[activeDataset]?.hawaiianHomelands || false;
    }, [dataset, activeDataset]);

    const censusLayer = usePolygonLayer<BlockGroupProperties>(
        polygonLayerConfigs.census
    );

    const homelandsLayer = usePolygonLayer<HawaiianHomelandProperties>({
        ...polygonLayerConfigs.hawaiianHomelands,
        enabled: shouldLoadHawaiianHomelands
    });

    return {
        censusBlocks: {
            data: censusLayer.data,
            loading: censusLayer.loading,
            error: censusLayer.error,
        },
        hawaiianHomelands: {
            data: shouldLoadHawaiianHomelands ? homelandsLayer.data : null,
            loading: homelandsLayer.loading,
            error: homelandsLayer.error,
        },
        isLoaded: shouldLoadHawaiianHomelands
            ? (censusLayer.data !== null && homelandsLayer.data !== null)
            : censusLayer.data !== null,
    };
};