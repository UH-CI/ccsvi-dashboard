import { useState, useEffect, useRef } from 'react';
import { FeatureCollection, Geometry } from 'geojson';
import {
  MetricsData,
  Dataset,
  BlockGroupProperties,
  HawaiianHomelandProperties
} from '../types';
import { mapParams } from '../config';

interface DataLoaderState {
  dataset: Dataset | null;
  geoData: FeatureCollection<Geometry, BlockGroupProperties> | null;
  homelandsData: FeatureCollection<Geometry, HawaiianHomelandProperties> | null;
  metricsData: MetricsData | null;
  loading: boolean;
  error: string | null;
}

export const useDataLoader = (activeDataset: string) => {
  const [state, setState] = useState<DataLoaderState>({
    dataset: null,
    geoData: null,
    homelandsData: null,
    metricsData: null,
    loading: true,
    error: null,
  });

  // Track what we've already loaded to prevent redundant requests
  const loadedHomelandsRef = useRef<boolean>(false);
  const homelandsLoadingRef = useRef<boolean>(false);

  // Load initial data (geo, metrics, dataset info)
  useEffect(() => {
    const loadInitialData = async () => {
      setState(prev => ({ ...prev, loading: true, error: null }));

      try {
        const [geoResponse, metricsResponse, datasetResponse] = await Promise.all([
          fetch(mapParams.geoJsonPath),
          fetch(mapParams.datasetPath),
          fetch('./data/metrics/census_datasets_info.json')
        ]);

        // Check if all requests were successful
        if (!geoResponse.ok || !metricsResponse.ok || !datasetResponse.ok) {
          const errorMessage = 'Failed to fetch one or more data files';
          console.error('Error loading initial data:', errorMessage);
          setState(prev => ({
            ...prev,
            loading: false,
            error: errorMessage,
          }));
          return;
        }

        const [geoData, metricsData, datasetData] = await Promise.all([
          geoResponse.json(),
          metricsResponse.json(),
          datasetResponse.json()
        ]);

        setState(prev => ({
          ...prev,
          geoData,
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

  useEffect(() => {
    // Don't do anything if initial data isn't loaded yet
    if (!state.dataset || state.loading) return;

    // Don't do anything if no active dataset
    if (!activeDataset) {
      // Clear homelands data if no dataset selected
      if (state.homelandsData) {
        setState(prev => ({ ...prev, homelandsData: null }));
        loadedHomelandsRef.current = false;
      }
      return;
    }

    const needsHomelands = state.dataset[activeDataset]?.hawaiianHomelands;

    // If current dataset doesn't need homelands, clear the data
    if (!needsHomelands) {
      if (state.homelandsData) {
        setState(prev => ({ ...prev, homelandsData: null }));
        loadedHomelandsRef.current = false;
      }
      return;
    }

    // If we need homelands but already have it loaded, we're done
    if (loadedHomelandsRef.current && state.homelandsData) return;

    // If we're already loading, don't start another request
    if (homelandsLoadingRef.current) return;

    const loadHomelandsData = async () => {
      homelandsLoadingRef.current = true;

      try {
        // Only set loading to true if we don't already have initial data loaded
        setState(prev => ({ ...prev, loading: !prev.geoData }));

        const response = await fetch('./data/Census_Hawaiian_Homelands_hhl10.geojson');

        if (!response.ok) {
          const errorMessage = 'Failed to fetch Hawaiian Homelands data';
          console.error('Error loading Hawaiian Homelands data:', errorMessage);
          setState(prev => ({
            ...prev,
            loading: false,
            error: errorMessage,
          }));
          return;
        }

        const data = await response.json();
        setState(prev => ({
          ...prev,
          homelandsData: data,
          loading: false
        }));
        loadedHomelandsRef.current = true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load Hawaiian Homelands data';
        console.error('Error loading Hawaiian Homelands data:', err);
        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));
      } finally {
        homelandsLoadingRef.current = false;
      }
    };

    loadHomelandsData().catch(console.error);
  }, [state.dataset, activeDataset, state.loading]);

  return {
    ...state,
    isInitialDataLoaded: !state.loading && state.dataset !== null && state.geoData !== null && state.metricsData !== null,
    hawaiianHomelands: state.dataset && activeDataset ? state.dataset[activeDataset]?.hawaiianHomelands || false : false,
  };
};