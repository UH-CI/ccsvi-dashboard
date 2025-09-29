import { useState, useEffect } from 'react';
import {
    MetricsData,
    Dataset,
} from '../types';
import { mapParams } from '../config';

interface DataLoaderState {
  dataset: Dataset | null;
  metricsData: MetricsData | null;
  loading: boolean;
  error: string | null;
}

export const useDataLoader = () => {
  const [state, setState] = useState<DataLoaderState>({
    dataset: null,
    metricsData: null,
    loading: true,
    error: null,
  });

  // Load initial data (metrics, dataset info)
  useEffect(() => {
    const loadInitialData = async () => {
      setState(prev => ({ ...prev, loading: true, error: null }));

      try {
        const [metricsResponse, datasetResponse] = await Promise.all([
          fetch(mapParams.datasetPath),
          fetch('./data/metrics/census_datasets_info.json')
        ]);

        // Check if all requests were successful
        if (!metricsResponse.ok || !datasetResponse.ok) {
          const errorMessage = 'Failed to fetch one or more data files';
          // console.error('Error loading initial data:', errorMessage);
          setState(prev => ({
            ...prev,
            loading: false,
            error: errorMessage,
          }));
          return;
        }

        const [metricsData, datasetData] = await Promise.all([
          metricsResponse.json(),
          datasetResponse.json()
        ]);

        setState(prev => ({
          ...prev,
          metricsData,
          dataset: datasetData,
          loading: false,
        }));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
        // console.error('Error loading initial data:', err);
        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));
      }
    };

    loadInitialData().catch(console.error);
  }, []);

  return {
    ...state,
    isInitialDataLoaded: !state.loading && state.dataset !== null && state.metricsData !== null,
  };
};