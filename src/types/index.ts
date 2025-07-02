import { Feature, Geometry } from 'geojson';
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

export type StyleFunction = (feature: Feature<Geometry, BlockGroupProperties> | undefined) => PathOptions;
export type HomelandsStyleFunction = (feature: Feature<Geometry, HawaiianHomelandProperties> | undefined) => PathOptions;