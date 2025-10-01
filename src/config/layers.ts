export interface PopupFieldConfig {
    key: string;
    label: string;
}

export interface PopupConfig {
    title: string;
    fields: PopupFieldConfig[];
}

export interface PolygonLayerConfig {
    name: string;
    path: string;
    geoidProperty: string;
    popup: PopupConfig;
}

export const POLYGON_LAYERS = {
    censusBlockGroups: {
        name: 'Census Block Groups',
        path: './data/2020_Census_Block_Groups_WGS84.geojson',
        geoidProperty: 'geoid20',
        popup: {
            title: 'Census Block Group',
            fields: [
                { key: 'geoid20', label: 'Geo ID' }
            ]
        }
    },

    hawaiianHomelands: {
        name: 'Hawaiian Homelands',
        path: './data/Census_Hawaiian_Homelands_hhl10.geojson',
        geoidProperty: 'GEOID10',
        popup: {
            title: 'Hawaiian Homeland',
            fields: [
                { key: 'GEOID10', label: 'Geo ID' },
                { key: 'NAME10', label: 'Name' }
            ]
        }
    }
};