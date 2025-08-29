import {LatLngBoundsExpression} from "leaflet";

export const mapParams = {
    mapCenter: [20.6427, -157.5769] as [number, number],
    mapZoom: 8,
    minZoom: 7,
    maxBounds: [[18, -162], [24, -154]] as LatLngBoundsExpression,
    maxBoundsViscosity: 1,
    geoidField: 'geoid20',
    geoJsonPath: './data/2020_Census_Block_Groups_WGS84.geojson',
    datasetPath: './data/metrics/all_census.json',
};