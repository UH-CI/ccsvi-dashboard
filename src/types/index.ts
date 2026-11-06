export interface MapConfig {
  id: string;
  title: string;
  dataset: string;
  metric: string;
  dataset2?: string;
  metric2?: string;
  bivariateColorScheme?: string;
  visible: boolean;
  colorScheme: string;
  baseMap?: string;
  activeFeature?: {
    geoid: string;
  };
}

export type ReliabilityTier = "reliable" | "usable" | "caution" | "severe" | "unreliable" | "neutral";

export interface Reliability {
  label: string;
  tier: ReliabilityTier;
}

export interface MetricValue {
  absolute: number | null;
  margin_of_error: number | null;
  percentage: number | null;
  moe_percentage_points: number | null;
  reliability: Reliability;
  moe_derived: boolean | null;
}

export interface GeographyMetadata {
  name: string | null;
  block_group: string | null;
  census_tract: string | null;
  county: string | null;
}

export type GeographiesData = Record<string, GeographyMetadata>;

export interface DatasetMetadata {
  table_id: string;
  program: string;
  period: string;
  citation: string;
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
  description?: string;
  visible: boolean;
  icon: string;
  color: string;
  filePath: string;
  // Properties that together identify one point in this layer's file
  idFields: string[];
  data?: import("geojson").FeatureCollection<import("geojson").Point>;
  popupConfig: {
    titleField: string;
    fields: Array<{
      key: string;
      label: string;
    }>;
  };
}

// A line or polygon layer or sub-layer as written in config/layers/lines.json and polygons.json
// (the fields the app reads)
export interface SubHazardLayerConfig {
  id: string;
  name: string;
  description?: string;
  color?: string;
  // Map tiles are hazards/<file>.pmtiles, whose layer is also named <file>
  file?: string;
  // title: the column whose value heads the popup; fields: columns shown under hand-written labels
  popup?: {
    title?: string;
    fields?: { key: string; label: string }[];
  };
  // Switched off: kept in the file, left out of the app
  off?: boolean;
}

export interface HazardLayerConfig extends SubHazardLayerConfig {
  icon?: string;
  subLayers?: SubHazardLayerConfig[];
}

// A raster layer or sub-layer as written in config/layers/rasters.json (the fields the app reads)
export interface SubRasterLayerConfig {
  id: string;
  name: string;
  description?: string;
  color?: string;
  // TiTiler built-in colormap name; set on every layer that has a file
  colormap?: string;
  // Shown on the map legend, popup and table
  units?: string;
  opacity?: number;
  // Switched off: kept in the file, left out of the app
  off?: boolean;
}

export interface RasterLayerConfig extends SubRasterLayerConfig {
  icon?: string;
  subLayers?: SubRasterLayerConfig[];
}

export interface BlockGroupResult {
  geoid: string;
  name: string | null;
  county: string | null;
  population: number | null;
  [key: string]: number | string | null;
}

export interface CatalogMetric {
  mvColumn: string | null;
}

export interface CatalogDataset {
  metricLabel: string;
  hawaiianHomelands: boolean;
  // 'census', 'point' or 'raster'
  sourceType: string;
  // The map layer a point or raster dataset belongs to; null for census
  layerId: string | null;
  metadata?: DatasetMetadata | null;
  columnThresholds: Record<string, CatalogMetric>;
}

export type DatasetCatalog = Record<string, CatalogDataset>;
