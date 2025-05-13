import {LatLngBoundsExpression} from "leaflet";

export const mapParams = {
    mapCenter: [20.6427, -157.5769] as [number, number],
    mapZoom: 8,
    minZoom: 7,
    maxBounds: [[18, -162], [24, -154]] as LatLngBoundsExpression,
    maxBoundsViscosity: 1,
    geoidField: 'geoid20',
    geoJsonPath: '/data/2020_Census_Block_Groups_WGS84.geojson',
    datasetPath: '/data/metrics/all_census.json',
};

export const datasetParams = {
    computers: {
        metricName: 'No Computer',
        metricLabel: 'Households without computers',
        thresholds: [0, 1, 5, 10, 25, 50, 75, 100],
        colors: ['#FFEDA0', '#FED976', '#FEB24C', '#FD8D3C', '#FC4E2A', '#E31A1C', '#BD0026', '#800026']
    },
    test: {
        metricName: 'No Internet access',
        metricLabel: 'Households without internet access',
        thresholds: [0, 1, 5, 10, 25, 50, 75, 100],
        colors: ['#FFEDA0', '#FED976', '#FEB24C', '#FD8D3C', '#FC4E2A', '#E31A1C', '#BD0026', '#800026']
    }
};