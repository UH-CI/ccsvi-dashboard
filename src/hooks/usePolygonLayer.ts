import { useState, useEffect, useRef } from 'react';
import {FeatureCollection, Geometry, GeoJsonProperties} from 'geojson';
import { PolygonLayerConfig } from '../types';

export interface PolygonLayerState<T extends GeoJsonProperties = GeoJsonProperties> {
  data: FeatureCollection<Geometry, T> | null;
  loading: boolean;
  error: string | null;
  loaded: boolean;
}

export const usePolygonLayer =  <T extends GeoJsonProperties = GeoJsonProperties>(
  config: PolygonLayerConfig
): PolygonLayerState<T> => {
  const [state, setState] = useState<PolygonLayerState<T>>({
    data: null,
    loading: false,
    error: null,
    loaded: false,
  });

  const loadingRef = useRef<boolean>(false);

  useEffect(() => {
    // Don't load if not enabled
    if (!config.enabled) {
      if (state.data) {
        setState(prev => ({ ...prev, data: null, loaded: false }));
      }
      return;
    }

    // If already loaded, don't reload
    if (state.loaded && state.data) return;

    // If already loading, don't start another request
    if (loadingRef.current) return;

    const loadData = async () => {
      loadingRef.current = true;
      setState(prev => ({ ...prev, loading: true, error: null }));

      try {
        const response = await fetch(config.path);

        if (!response.ok) {
          const errorMessage = `Failed to fetch ${config.name} data`;
          // console.error(`Error loading ${config.name} data:`, errorMessage);
          setState(prev => ({
            ...prev,
            loading: false,
            error: errorMessage,
          }));
          return;
        }

        const data = await response.json() as FeatureCollection<Geometry, T>;
        setState(prev => ({
          ...prev,
          data,
          loading: false,
          loaded: true,
        }));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : `Failed to load ${config.name} data`;
        console.error(`Error loading ${config.name} data:`, err);
        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));
      } finally {
        loadingRef.current = false;
      }
    };

    loadData().catch(console.error);
  }, [config.enabled, config.path, config.name, state.loaded, state.data]);

  return state;
};
