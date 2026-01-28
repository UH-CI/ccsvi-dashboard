import { MapConfig } from '../types';

export interface SerializedMapState {
    maps: string;
    datasets: Record<string, string>;
    metrics: Record<string, string>;
}

export interface DeserializedState {
    mapConfigs: Partial<MapConfig>[];
    pointLayers: string[];
    hazardLayers: string[];
}

/**
 * Serializes map configurations into URL-friendly format
 * Format: "map1:vis,map2:hid,map3:vis"
 */
export function serializeMapConfigs(configs: MapConfig[]): SerializedMapState {
    const maps = configs
        .map((config) => {
            const vis = config.visible ? 'vis' : 'hid';
            return `${config.id}:${vis}`;
        })
        .join(',');

    const datasets = configs.reduce((acc, config) => {
        if (config.dataset) {
            acc[`d_${config.id}`] = config.dataset;
        }
        return acc;
    }, {} as Record<string, string>);

    const metrics = configs.reduce((acc, config) => {
        if (config.metric) {
            acc[`m_${config.id}`] = config.metric;
        }
        return acc;
    }, {} as Record<string, string>);

    return { maps, datasets, metrics };
}

export function deserializeMapConfigs(params: URLSearchParams): DeserializedState {
    const mapsParam = params.get('maps');

    if (!mapsParam) {
        return {
            mapConfigs: [],
            pointLayers: [],
            hazardLayers: [],
        };
    }

    const mapConfigs: Partial<MapConfig>[] = mapsParam.split(',').map((mapStr) => {
        const [id, vis] = mapStr.split(':');

        return {
            id,
            visible: vis === 'vis',
            dataset: params.get(`d_${id}`) || '',
            metric: params.get(`m_${id}`) || '',
        };
    });

    // Parse point layers
    const layersParam = params.get('layers');
    const pointLayers = layersParam ? layersParam.split(',').filter(Boolean) : [];

    // Parse hazard layers
    const hazardsParam = params.get('hazards');
    const hazardLayers = hazardsParam ? hazardsParam.split(',').filter(Boolean) : [];

    return { mapConfigs, pointLayers, hazardLayers };
}

export function validateAndNormalize(state: DeserializedState): DeserializedState {
    const { mapConfigs, pointLayers, hazardLayers } = state;

    // Validate map configs
    const validMapConfigs = mapConfigs.filter((config) => {
        // Ensure valid map ID format (map1, map2, etc.)
        return config.id && /^map\d+$/.test(config.id);
    });

    // If no valid maps, return empty state
    if (validMapConfigs.length === 0) {
        return {
            mapConfigs: [],
            pointLayers: [],
            hazardLayers: [],
        };
    }

    // Limit to 4 maps maximum
    const limitedMapConfigs = validMapConfigs.slice(0, 4);

    return {
        mapConfigs: limitedMapConfigs,
        pointLayers,
        hazardLayers,
    };
}