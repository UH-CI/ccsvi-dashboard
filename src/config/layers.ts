import { PathOptions } from "leaflet";
import type { LayerMetadata } from "../types";
import { NO_VALUE_COLOR } from "./colorSchemes";

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
  disabled?: PathOptions;
  filterMatch?: PathOptions;
  noData?: PathOptions;
  background?: PathOptions;
}

export interface PolygonLayerConfig {
  name: string;
  metadata: LayerMetadata;
  geoidProperty: string;
  popup: PopupConfig;
  styles: LayerStyleConfig;
}

export const POLYGON_LAYERS = {
  censusBlockGroups: {
    name: "Census Block Groups",
    metadata: {
      citation: "U.S. Census Bureau; Hawaiʻi Statewide GIS Program",
      period: "September 2021",
      link: "https://geoportal.hawaii.gov/datasets/HiStateGIS::2020-census-block-groups/about",
    },
    geoidProperty: "geoid20",
    popup: {
      title: "Census Block Group",
      fields: [
        { key: "geoid20", label: "Geo ID" },
        { key: "pop20", label: "2020 Population" },
      ],
    },
    styles: {
      default: {
        fillColor: NO_VALUE_COLOR,
        weight: 1.5,
        opacity: 1,
        color: "#000000",
        fillOpacity: 0.3,
      },
      highlight: {
        weight: 4,
        color: "#000000",
        opacity: 1,
        fillOpacity: 0.8,
      },
      disabled: {
        fillColor: "#aaaaaa",
        fillOpacity: 0.4,
        color: "#888888",
        weight: 0.5,
        opacity: 0.5,
      },
      filterMatch: {
        color: "#ff6b00",
        weight: 3,
        opacity: 1,
        fillOpacity: 0.85,
      },
      background: {
        fillColor: "#ff6b00",
        weight: 2,
        opacity: 1,
        color: "#333333",
        fillOpacity: 0.1,
      },
    },
  } satisfies PolygonLayerConfig,

  hawaiianHomelands: {
    name: "Hawaiian Homelands",
    metadata: { citation: "U.S. Census Bureau, Geography Division", period: "2010" },
    geoidProperty: "GEOID10",
    popup: {
      title: "Hawaiian Homeland",
      fields: [
        { key: "GEOID10", label: "Geo ID" },
        { key: "POP10", label: "Population" },
      ],
    },
    styles: {
      default: {
        fillColor: NO_VALUE_COLOR,
        weight: 0.5,
        opacity: 1,
        color: "#333",
        fillOpacity: 0.6,
      },
      highlight: {
        weight: 4,
        color: "#000000",
        opacity: 1,
        fillOpacity: 0.8,
      },
      disabled: {
        fillColor: "#aaaaaa",
        fillOpacity: 0.4,
        color: "#888888",
        weight: 0.5,
        opacity: 0.5,
      },
      filterMatch: {
        color: "#ff6b00",
        weight: 3,
        opacity: 1,
        fillOpacity: 0.85,
      },
      background: {
        fillColor: "#ff6b00",
        weight: 2,
        opacity: 1,
        color: "#333333",
        fillOpacity: 0.1,
      },
    },
  } satisfies PolygonLayerConfig,

  countyBoundaries: {
    name: "County Boundaries",
    metadata: {
      citation: "U.S. Census Bureau; Hawaiʻi Statewide GIS Program",
      period: "September 2021",
      link: "https://geoportal.hawaii.gov/datasets/HiStateGIS::2020-census-county-boundaries/about",
    },
    geoidProperty: "NAME20",
    popup: {
      title: "County",
      fields: [
        { key: "NAME20", label: "County Name" },
        { key: "POP20", label: "2020 Population" },
      ],
    },
    styles: {
      default: {
        fillColor: NO_VALUE_COLOR,
        weight: 0.5,
        opacity: 0.3,
        color: "#999",
        fillOpacity: 0.2,
        dashArray: "5, 5",
      },
      disabled: {
        fillColor: "#e0e0e0",
        weight: 0.8,
        opacity: 0.5,
        color: "#999",
        fillOpacity: 0.8,
        dashArray: "5, 5",
      },
    },
  } satisfies PolygonLayerConfig,
} as const;
