// utils/mapStyles.ts
import { Feature } from 'geojson';
import { PathOptions } from 'leaflet';

// Types for better type safety
interface ThresholdConfig {
    thresholds: number[];
    colors: string[];
}

interface StyleConfig {
    activeColor: string;
    inactiveColor: string;
    activeWeight: number;
    inactiveWeight: number;
    activeFillOpacity: number;
    inactiveFillOpacity: number;
}

// Style function type that works with standard GeoJSON properties
type StyleFunction = (feature?: Feature) => PathOptions;

// Default style configuration
const DEFAULT_STYLE: PathOptions = {
    fillColor: '#cccccc',
    weight: 0.5,
    opacity: 1,
    color: '#333',
    fillOpacity: 0.3
};

// Default style configs for different feature types
const CENSUS_STYLE_CONFIG: StyleConfig = {
    activeColor: '#000',
    inactiveColor: '#333',
    activeWeight: 3,
    inactiveWeight: 1,
    activeFillOpacity: 0.8,
    inactiveFillOpacity: 0.5,
};

const HOMELANDS_STYLE_CONFIG: StyleConfig = {
    activeColor: '#654321',
    inactiveColor: '#8B4513',
    activeWeight: 3,
    inactiveWeight: 1,
    activeFillOpacity: 0.8,
    inactiveFillOpacity: 0.5,
};

/**
 * Creates a color function based on thresholds and colors
 * Pure function - easy to test and reuse
 */
export const createColorFunction = (config: ThresholdConfig | null) => {
    return (value: number | null): string => {
        if (value === null || !config) {
            return '#cccccc';
        }

        for (let i = 0; i < config.thresholds.length; i++) {
            if (value <= config.thresholds[i]) {
                return config.colors[i];
            }
        }
        return '#333';
    };
};

/**
 * Creates a style function for map features
 * Handles the common pattern of styling active vs inactive features
 */
export const createFeatureStyleFunction = (
    getColor: (value: number | null) => string,
    getMetricValue: (geoid: string) => number | null,
    activeFeature: Feature | null,
    geoidProperty: string,
    styleConfig: StyleConfig = CENSUS_STYLE_CONFIG
): StyleFunction => {
    return (feature?: Feature): PathOptions => {
        if (!feature || !feature.properties) {
            return DEFAULT_STYLE;
        }

        const geoid = feature.properties[geoidProperty] as string;
        const metricValue = getMetricValue(geoid);
        const isActive = activeFeature?.properties?.[geoidProperty] === geoid;

        return {
            fillColor: getColor(metricValue),
            weight: isActive ? styleConfig.activeWeight : styleConfig.inactiveWeight,
            opacity: 1,
            color: isActive ? styleConfig.activeColor : styleConfig.inactiveColor,
            fillOpacity: isActive ? styleConfig.activeFillOpacity : styleConfig.inactiveFillOpacity,
        };
    };
};

/**
 * Convenience function for census block group styling
 */
export const createCensusStyleFunction = (
    getColor: (value: number | null) => string,
    getMetricValue: (geoid: string) => number | null,
    activeFeature: Feature | null
): StyleFunction => {
    return createFeatureStyleFunction(
        getColor,
        getMetricValue,
        activeFeature,
        'geoid20',
        CENSUS_STYLE_CONFIG
    );
};

/**
 * Convenience function for Hawaiian Homelands styling
 */
export const createHomelandsStyleFunction = (
    getColor: (value: number | null) => string,
    getMetricValue: (geoid: string) => number | null,
    activeFeature: Feature | null
): StyleFunction => {
    return createFeatureStyleFunction(
        getColor,
        getMetricValue,
        activeFeature,
        'GEOID10',
        HOMELANDS_STYLE_CONFIG
    );
};

// Export style configs for customization if needed
export { CENSUS_STYLE_CONFIG, HOMELANDS_STYLE_CONFIG, DEFAULT_STYLE };

/**
 * Creates a generic style function for any polygon layer
 */
export const createGenericStyleFunction = <T = any>(
    getColor: (value: number | null) => string,
    getMetricValue: (geoid: string) => number | null,
    activeFeature: Feature | null,
    geoidProperty: string,
    styleConfig: StyleConfig = CENSUS_STYLE_CONFIG
): ((feature?: Feature<Geometry, T>) => PathOptions) => {
    return (feature?: Feature<Geometry, T>): PathOptions => {
        if (!feature || !feature.properties) {
            return DEFAULT_STYLE;
        }

        const geoid = feature.properties[geoidProperty] as string;
        const metricValue = getMetricValue(geoid);
        const isActive = activeFeature?.properties?.[geoidProperty] === geoid;

        return {
            fillColor: getColor(metricValue),
            weight: isActive ? styleConfig.activeWeight : styleConfig.inactiveWeight,
            opacity: 1,
            color: isActive ? styleConfig.activeColor : styleConfig.inactiveColor,
            fillOpacity: isActive ? styleConfig.activeFillOpacity : styleConfig.inactiveFillOpacity,
        };
    };
};