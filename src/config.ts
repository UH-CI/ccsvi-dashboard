import {LatLngBoundsExpression} from "leaflet";

export const mapParams = {
    mapCenter: [20.6427, -157.5769] as [number, number],
    mapZoom: 8,
    minZoom: 7,
    maxBounds: [[18, -161], [23, -154]] as LatLngBoundsExpression,
    maxBoundsViscosity: 0.5,
    geoidField: 'geoid20',
    geoJsonPath: '/data/2020_Census_Block_Groups_WGS84.geojson'
};

export const datasetParams = {
    computers: {
        datasetPath: '/data/metrics/households_w_computer.json',
        metricName: 'No Computer',
        metricLabel: 'Households without computers',
        thresholds: [0, 1, 5, 10, 25, 50, 75, 100],
        colors: ['#FFEDA0', '#FED976', '#FEB24C', '#FD8D3C', '#FC4E2A', '#E31A1C', '#BD0026', '#800026']
    },
    tenure: {
        datasetPath: '/data/metrics/tenure.json',
        metricName: 'Renter occupied',
        metricLabel: 'Renter occupied',
        thresholds: [0, 1, 5, 10, 25, 50, 75, 100],
        colors: ['#FFEDA0', '#FED976', '#FEB24C', '#FD8D3C', '#FC4E2A', '#E31A1C', '#BD0026', '#800026']
    }
};