import type {
  GeographiesData,
  Dataset,
  BlockGroupProperties,
  HawaiianHomelandProperties,
  CountyBoundariesProperties,
} from "../types";
import type { FeatureCollection, Geometry } from "geojson";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export const DATASETS_CONFIG = {
  geographiesData: {
    path: `${API_BASE}/api/v1/geographies`,
    errorPrefix: "Failed to fetch geography metadata",
  },
  blockGroupData: {
    path: `${API_BASE}/api/v1/datasets`,
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
  geographiesData: GeographiesData;
  blockGroupData: Dataset;
  censusBlockGroups: FeatureCollection<Geometry, BlockGroupProperties>;
  hawaiianHomelands: FeatureCollection<Geometry, HawaiianHomelandProperties>;
  countyBoundaries: FeatureCollection<Geometry, CountyBoundariesProperties>;
}
