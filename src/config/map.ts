import { LatLngBoundsExpression } from 'leaflet';

export const MAP_CONFIG = {
    center: [20.6427, -157.5769] as [number, number],
    zoom: 8,
    minZoom: 7,
    maxBounds: [[18, -162], [24, -154]] as LatLngBoundsExpression,
    maxBoundsViscosity: 1,
} as const;