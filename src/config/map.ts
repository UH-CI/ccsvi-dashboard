import { LatLngBoundsExpression } from "leaflet";

// The most maps shown side by side; Add Map stops here and a link with more keeps the first ones
export const MAX_MAPS = 4;

// The map's own drawing layers and their order: higher is drawn on top. Leaflet's shapes are at 400
// and its markers at 600, so rasters sit under the area colours and hazards over them.
export const MAP_PANES = { rasterPane: 350, hazardPane: 450 } as const;
export type MapPane = keyof typeof MAP_PANES;

export const MAP_CONFIG = {
  center: [20.6427, -157.5769] as [number, number],
  zoom: 8,
  minZoom: 7,
  maxBounds: [
    [17, -163],
    [24.5, -153],
  ] as LatLngBoundsExpression,
  maxBoundsViscosity: 1,
} as const;
