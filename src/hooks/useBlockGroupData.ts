import { MetricsData, Dataset } from '../types';
import { mapParams } from '../config';
import { useMultiDataFetcher } from './useDataFetcher';

interface BlockGroupData {
    metricsData: MetricsData;
    dataset: Dataset;
}

export const useBlockGroupData = () => {
    const state = useMultiDataFetcher<BlockGroupData>(
        [
            {
                key: 'metricsData' as keyof BlockGroupData,
                url: mapParams.datasetPath,
                errorPrefix: 'Failed to fetch metrics data'
            },
            {
                key: 'dataset' as keyof BlockGroupData,
                url: mapParams.censusMetadataPath,
                errorPrefix: 'Failed to fetch census metadata'
            }
        ]
    );

    return {
        dataset: state.data?.dataset ?? null,
        metricsData: state.data?.metricsData ?? null,
        loading: state.loading,
        error: state.error,
        isLoaded: !state.loading && state.data !== null,
    };
};