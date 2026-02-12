import {Feature, Geometry} from 'geojson';
import { PathOptions } from 'leaflet';

export type ColorSchemeName = 'viridis' | 'reds' | 'blues';

export interface MapConfig {
    id: string;
    title: string;
    dataset: string;
    metric: string;
    visible: boolean;
    colorScheme: ColorSchemeName;
    activeFeature?: {
        geoid: string;
        lat: number;
        lng: number;
        zoom: number;
    };
}

export interface MetricsData {
    [geoid: string]: {
        block_group: string;
        census_tract: string;
        county: string;
        metrics: {
            [datasetName: string]: {
                [metricName: string]: number;
            }
        };
    }
}

export interface Dataset {
    [key: string]: {
        metricName: string;
        metricLabel: string;
        hawaiianHomelands?: boolean;
        columnThresholds: {
            [columnName: string]: {
                thresholds: number[];
                colors: string[];
            }
        }
    }
}

export interface BlockGroupProperties {
    objectid: number;
    geoid20: string;
    aland20: number;
    awater20: number;
    pop20: number;
    st_areasha: number;
    st_perimet: number;
}

export interface HawaiianHomelandProperties {
    AIANNHCE10: string;
    AIANNHNS10: string;
    GEOID10: string;
    NAME10: string;
    AIANNHFP10: string;
    POP10: number;
    Shape_Leng: number;
    Shape_Area: number;
}

export interface CountyBoundariesProperties {
    NAME20: string;
    POP20: number;
}

export interface PointLayerConfig {
    id: string;
    name: string;
    visible: boolean;
    icon: string;
    color: string;
    filePath: string;
    data?: import('geojson').FeatureCollection<import('geojson').Point>;
    popupConfig: {
        titleField: string;
        fields: Array<{
            key: string;
            label: string;
        }>;
    };
}

export interface SubHazardLayerConfig {
    id: string;
    name: string;
    color?: string;
    visible: boolean;
    filePath?: string;
    popupConfig?: {
        titleField?: string;
        fields?: { key: string; label: string }[];
    };
    subLayers?: SubHazardLayerConfig[];
}

export interface SubHazardLayerGroup {
    id: string;
    name: string;
    subLayers: SubHazardLayerConfig[];
}

export interface HazardLayerConfig {
    id: string;
    name: string;
    icon?: string;
    color?: string;
    visible: boolean;
    filePath?: string;
    popupConfig?: {
        titleField?: string;
        fields?: { key: string; label: string }[];
    };
    subLayers?: SubHazardLayerConfig[];
}

export interface SubRasterLayerConfig {
    id: string;
    name: string;
    color?: string;
    filePath?: string;
    popupConfig?: {
        titleField?: string;
        fields?: { key: string; label: string }[];
    };
    overviewZoom?: {
        minZoom: number;
        maxZoom: number;
        overviewIndex: number;
    }[];
    opacity?: number;
    type?: 'raster';
}



export interface RasterLayerConfig {
    id: string;
    name: string;
    icon?: string;
    color?: string;
    filePath?: string;
    opacity?: number;
    type?: 'raster';
    popupConfig?: {
        titleField?: string;
        fields?: { key: string; label: string }[];
    };
    overviewZoom?: {
        minZoom: number;
        maxZoom: number;
        overviewIndex: number;
    }[];
    subLayers?: SubRasterLayerConfig[];
}

export type StyleFunction = (feature: Feature<Geometry, BlockGroupProperties> | undefined) => PathOptions;
export type HomelandsStyleFunction = (feature: Feature<Geometry, HawaiianHomelandProperties> | undefined) => PathOptions;

// Generic polygon layer types
export interface PolygonLayerConfig {
  name: string;
  path: string;
  geoidProperty: string;
  enabled: boolean;
  popupConfig: {
    title: string;
    fields: Array<{ key: string; label: string }>;
  };
  styleConfig?: {
    activeColor: string;
    inactiveColor: string;
    activeWeight: number;
    inactiveWeight: number;
    activeFillOpacity: number;
    inactiveFillOpacity: number;
  };
}