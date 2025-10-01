import {LatLngBoundsExpression} from "leaflet";
import { PolygonLayerConfig } from './types';

export const mapParams = {
    mapCenter: [20.6427, -157.5769] as [number, number],
    mapZoom: 8,
    minZoom: 7,
    maxBounds: [[18, -162], [24, -154]] as LatLngBoundsExpression,
    maxBoundsViscosity: 1,
    geoidField: 'geoid20',
    censusBlockGroupGeoJsonPath: './data/2020_Census_Block_Groups_WGS84.geojson',
    censusDatasetsPath: './data/metrics/census_metrics_by_block_group.json',
    censusDatasetsInfoPath: './data/metrics/census_datasets_config.json',
};

// Block group polygon layer configurations
export const blockGroupPolygonLayerConfigs = {
    census: {
        name: 'Census Block Groups',
        path: mapParams.censusBlockGroupGeoJsonPath,
        geoidProperty: 'geoid20',
        enabled: true,
        popupConfig: {
            title: 'Census Block Group',
            fields: [
                { key: 'geoid20', label: 'Geo Id' },
            ]
        }
    } as PolygonLayerConfig & { popupConfig: { title: string; fields: Array<{ key: string; label: string }> } },
    
    hawaiianHomelands: {
        name: 'Hawaiian Homelands',
        path: './data/Census_Hawaiian_Homelands_hhl10.geojson',
        geoidProperty: 'GEOID10',
        enabled: true,
        popupConfig: {
            title: 'Hawaiian Homeland',
            fields: [
                { key: 'GEOID10', label: 'Geo Id' },
                { key: 'NAME10', label: 'Name' }
            ]
        }
    } as PolygonLayerConfig & { popupConfig: { title: string; fields: Array<{ key: string; label: string }> } }
};