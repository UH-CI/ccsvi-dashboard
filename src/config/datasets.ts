import type {
  MetricsData,
  Dataset,
  BlockGroupProperties,
  HawaiianHomelandProperties,
  CountyBoundariesProperties,
} from "../types";
import type { FeatureCollection, Geometry } from "geojson";

export const DATASETS_CONFIG = {
  metricsData: {
    path: "./data/metrics/census_metrics_by_block_group.json",
    errorPrefix: "Failed to fetch census metrics dataset",
  },
  blockGroupData: {
    path: "./data/metrics/census_datasets_config.json",
    errorPrefix: "Failed to fetch dataset metadata",
  },
  censusBlockGroups: {
    path: "./data/2020_Census_Block_Groups_Stripped.geojson",
    errorPrefix: "Failed to fetch census block group data",
  },
  hawaiianHomelands: {
    path: "./data/Census_Hawaiian_Homelands_hhl10_Stripped.geojson",
    errorPrefix: "Failed to fetch hawaiian homelands data",
  },
  countyBoundaries: {
    path: "./data/2020_Census_County_Boundaries_Stripped.geojson",
    errorPrefix: "Failed to fetch county boundaries data",
  },
} as const;

// Type utilities for the store
export type DataSourceKey = keyof typeof DATASETS_CONFIG;
export const DATA_SOURCE_KEYS = Object.keys(DATASETS_CONFIG) as DataSourceKey[];

// Type map for store
export interface DataSourceTypeMap {
  metricsData: MetricsData;
  blockGroupData: Dataset;
  censusBlockGroups: FeatureCollection<Geometry, BlockGroupProperties>;
  hawaiianHomelands: FeatureCollection<Geometry, HawaiianHomelandProperties>;
  countyBoundaries: FeatureCollection<Geometry, CountyBoundariesProperties>;
}
