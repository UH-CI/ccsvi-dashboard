import { useState, useEffect } from 'react';
// import { FeatureCollection, Geometry } from 'geojson';
import {
    MetricsData,
    Dataset,
    PolygonLayerConfig, BlockGroupProperties, HawaiianHomelandProperties
} from '../types';
import { mapParams } from '../config';
import { usePolygonLayer } from './usePolygonLayer';

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
          console.error('Error loading initial data:', errorMessage);
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
        console.error('Error loading initial data:', err);
        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));
      }
    };

    loadInitialData().catch(console.error);
  }, []);

  // Configure polygon layers
  const censusConfig: PolygonLayerConfig = {
    name: 'Census Block Groups',
    path: mapParams.geoJsonPath,
    geoidProperty: 'geoid20',
    enabled: true,
  };

  const homelandsConfig: PolygonLayerConfig = {
    name: 'Hawaiian Homelands',
    path: './data/Census_Hawaiian_Homelands_hhl10.geojson',
    geoidProperty: 'GEOID10',
    enabled: true,
  };

  // Use the generic polygon layer hooks
  const censusLayer = usePolygonLayer<BlockGroupProperties>(censusConfig);
  const homelandsLayer = usePolygonLayer<HawaiianHomelandProperties>(homelandsConfig);

  return {
    ...state,
    geoData: censusLayer.data,
    homelandsData: homelandsLayer.data,
    isInitialDataLoaded: !state.loading && state.dataset !== null && censusLayer.data !== null && state.metricsData !== null,
    // Layer loading states
    censusLoading: censusLayer.loading,
    homelandsLoading: homelandsLayer.loading,
    censusError: censusLayer.error,
    homelandsError: homelandsLayer.error,
  };
};