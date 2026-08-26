import { Feature, Geometry } from "geojson";
import { PathOptions } from "leaflet";

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
    lat: number;
    lng: number;
    zoom: number;
  };
}

export interface MetricValue {
  absolute: number | null;
  margin_of_error: number | null;
  percentage: number | null;
}

export interface GeographyMetadata {
  name: string | null;
  block_group: string | null;
  census_tract: string | null;
  county: string | null;
}

export type GeographiesData = Record<string, GeographyMetadata>;

export interface MetricConfig {
  classificationMode?: string;
}

export interface Dataset {
  [key: string]: {
    metricName: string;
    metricLabel: string;
    hawaiianHomelands?: boolean;
    columnThresholds: {
      [columnName: string]: MetricConfig;
    };
  };
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
  data?: import("geojson").FeatureCollection<import("geojson").Point>;
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

export type HazardLayerMenuPanel = "hazards" | "points";

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
  menuPanel?: HazardLayerMenuPanel;
  menuGroup?: string;
}

export interface SubRasterLayerConfig {
  id: string;
  name: string;
  color?: string;
  // The underlying COG file name, used by the popup zonal stats flow.
  sourceFileName?: string;
  // Use TiTiler built-in colormap names
  colormapName?: string;
  // Shown on the map legend and click-to-query popup
  units?: string;
  opacity?: number;
  type?: "raster";
  /** @deprecated Replaced by TiTiler catalog-based raster_id. REMOVE */
  filePath?: string;

  
  /** @deprecated TiTiler selects overview level automatically. REMOVE */
  overviewZoom?: {
    minZoom: number;
    maxZoom: number;
    overviewIndex: number;
  }[];
  /** @deprecated Legend dimensions unused after TiTiler migration. REMOVE */
  legendWidthPx?: number;
  /** @deprecated Legend dimensions unused after TiTiler migration. REMOVE */
  legendGradientHeightPx?: number;
  popupConfig?: {
    titleField?: string;
    fields?: { key: string; label: string }[];
  };
}

export interface RasterLayerConfig {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  // The underlying COG file name, used by the popup zonal stats flow.
  sourceFileName?: string;
  // Use TiTiler built-in colormap names
  colormapName?: string;
  // Shown on the map legend and click-to-query popup
  units?: string;
  opacity?: number;
  type?: "raster";
  subLayers?: SubRasterLayerConfig[];
  /** @deprecated Replaced by TiTiler catalog-based raster_id. REMOVE */
  filePath?: string;
  /** @deprecated TiTiler selects overview level automatically. REMOVE */
  overviewZoom?: {
    minZoom: number;
    maxZoom: number;
    overviewIndex: number;
  }[];
  /** @deprecated Legend dimensions unused after TiTiler migration. REMOVE */
  legendWidthPx?: number;
  /** @deprecated Legend dimensions unused after TiTiler migration. REMOVE */
  legendGradientHeightPx?: number;
  popupConfig?: {
    titleField?: string;
    fields?: { key: string; label: string }[];
  };
}

export type StyleFunction = (
  feature: Feature<Geometry, BlockGroupProperties> | undefined,
) => PathOptions;
export type HomelandsStyleFunction = (
  feature: Feature<Geometry, HawaiianHomelandProperties> | undefined,
) => PathOptions;

export interface BlockGroupResult {
  geoid: string;
  name: string | null;
  county: string | null;
  population: number | null;
  [key: string]: number | string | null;
}

export interface CatalogMetric {
  classificationMode: string;
  mvColumn: string | null;
}

export interface CatalogDataset {
  metricLabel: string;
  hawaiianHomelands: boolean;
  columnThresholds: Record<string, CatalogMetric>;
}

export type DatasetCatalog = Record<string, CatalogDataset>;

export interface FilterParams {
  county?: string;
  hazardId?: string;
  subId?: string;
  heightFt?: number;
  metricFilters?: Partial<Record<string, number>>;
}

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
