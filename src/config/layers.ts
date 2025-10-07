import { PathOptions } from "leaflet";

export interface PopupFieldConfig {
    key: string;
    label: string;
}

export interface PopupConfig {
    title: string;
    fields: PopupFieldConfig[];
}

export interface LayerStyleConfig {
    default: PathOptions;
    highlight?: PathOptions;
    grayedOut?: PathOptions;
    noData?: PathOptions;
}

export interface PolygonLayerConfig {
    name: string;
    path: string;
    geoidProperty: string;
    popup: PopupConfig;
    styles: LayerStyleConfig;
}

export const POLYGON_LAYERS = {
    censusBlockGroups: {
        name: 'Census Block Groups',
        path: './data/2020_Census_Block_Groups_WGS84.geojson',
        geoidProperty: 'geoid20',
        popup: {
            title: 'Census Block Group',
            fields: [
                { key: 'geoid20', label: 'Geo ID' },
                { key: 'pop20', label: '2020 Population' }
            ]
        },
        styles: {
            default: {
                fillColor: '#cccccc',
                weight: 0.5,
                opacity: 1,
                color: '#333',
                fillOpacity: 0.3
            },
            highlight: {
                weight: 4,
                color: '#000000',
                opacity: 1,
                fillOpacity: 0.8
            }
        }
    } satisfies PolygonLayerConfig,

    hawaiianHomelands: {
        name: 'Hawaiian Homelands',
        path: './data/Census_Hawaiian_Homelands_hhl10.geojson',
        geoidProperty: 'GEOID10',
        popup: {
            title: 'Hawaiian Homeland',
            fields: [
                { key: 'GEOID10', label: 'Geo ID' },
                // { key: 'NAME10', label: 'Name' }
            ]
        },
        styles: {
            default: {
                fillColor: '#cccccc',
                weight: 0.5,
                opacity: 1,
                color: '#333',
                fillOpacity: 0.6
            },
            highlight: {
                weight: 4,
                color: '#000000',
                opacity: 1,
                fillOpacity: 0.8
            }
        }
    } satisfies PolygonLayerConfig,

    countyBoundaries: {
        name: 'County Boundaries',
        path: './data/2020_Census_County_Boundaries_Stripped.geojson',
        geoidProperty: 'NAME20',
        popup: {
            title: 'County',
            fields: [
                { key: 'NAME20', label: 'County Name' },
                { key: 'POP20', label: '2020 Population' }
            ]
        },
        styles: {
            default: {
                fillColor: '#cccccc',
                weight: 0.5,
                opacity: 0.3,
                color: '#999',
                fillOpacity: 0.2,
                dashArray: '5, 5'
            },
            grayedOut: {
                fillColor: '#e0e0e0',
                weight: 0.8,
                opacity: 0.5,
                color: '#999',
                fillOpacity: 0.8,
                dashArray: '5, 5'
            }
        }
    } satisfies PolygonLayerConfig
} as const;