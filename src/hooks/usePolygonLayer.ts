import { FeatureCollection, Geometry, GeoJsonProperties } from 'geojson';
import { PolygonLayerConfig } from '../types';
import { useDataFetcher, FetchState } from './useDataFetcher';

export type PolygonLayerState<T extends GeoJsonProperties = GeoJsonProperties> =
    FetchState<FeatureCollection<Geometry, T>>;

export const usePolygonLayer = <T extends GeoJsonProperties = GeoJsonProperties>(
    config: PolygonLayerConfig
): PolygonLayerState<T> => {
    return useDataFetcher<FeatureCollection<Geometry, T>>(
        config.path,
        {
            enabled: config.enabled,
            skipIfLoaded: true,
            errorPrefix: `Failed to fetch ${config.name} data`
        }
    );
};