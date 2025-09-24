import { Feature, Geometry, FeatureCollection } from 'geojson';
import { PathOptions } from 'leaflet';

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

export interface HazardLayerConfig {
    id: string;
    name: string;
    visible: boolean;
    icon: string;
    color?: string;
    filePath: string;
    data?: import('geojson').FeatureCollection<Geometry>; 
    popupConfig: {
        titleField: string;
        fields: Array<{
            key: string;
            label: string;
        }>;
    };
}

export type StyleFunction = (feature: Feature<Geometry, BlockGroupProperties> | undefined) => PathOptions;
export type HomelandsStyleFunction = (feature: Feature<Geometry, HawaiianHomelandProperties> | undefined) => PathOptions;

// Generic polygon layer types
export interface PolygonLayerConfig<T = any> {
  name: string;
  path: string;
  geoidProperty: string;
  enabled: boolean;
  styleConfig?: {
    activeColor: string;
    inactiveColor: string;
    activeWeight: number;
    inactiveWeight: number;
    activeFillOpacity: number;
    inactiveFillOpacity: number;
  };
}

export interface PolygonLayerState<T = any> {
  data: FeatureCollection<Geometry, T> | null;
  loading: boolean;
  error: string | null;
  loaded: boolean;
}