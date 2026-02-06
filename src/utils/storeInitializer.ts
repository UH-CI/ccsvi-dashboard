import { useMapStore, usePointLayerStore, useHazardLayersStore, useRasterLayersStore } from '../stores';
import { DeserializedState } from './urlSerializer';

/**
 * Initializes all stores from deserialized URL state
 * This should be called on app initialization or during browser navigation
 */
export function initializeStoresFromUrl(urlState: DeserializedState): void {
    initializeMapStore(urlState.mapConfigs);
    initializePointLayers(urlState.pointLayers);
    initializeHazardLayers(urlState.hazardLayers);
    initializeRasterLayers(urlState.rasterLayers);
}

/**
 * Initializes map store from URL
 */
function initializeMapStore(mapConfigs: DeserializedState['mapConfigs']): void {
    const mapStore = useMapStore.getState();

    mapStore.reset();

    // If no maps in URL, use default from reset()
    if (mapConfigs.length === 0) {
        return;
    }

    // Initialize maps from URL config
    mapConfigs.forEach((config, index) => {
        if (index === 0) {
            // Update the default first map from reset()
            mapStore.updateMapConfig('map1', {
                dataset: config.dataset || '',
                metric: config.metric || '',
                visible: config.visible ?? true,
            });
        } else {
            // Add additional maps
            mapStore.addMap();
            const mapId = `map${index + 1}`;
            mapStore.updateMapConfig(mapId, {
                dataset: config.dataset || '',
                metric: config.metric || '',
                visible: config.visible ?? true,
            });
        }
    });
}

/**
 * Initializes point layers from URL
 * layerIds are in "mapId:layerId" format (e.g. ["map1:hospitals", "map2:schools"])
 */
function initializePointLayers(layerIds: string[]): void {
    const pointLayerStore = usePointLayerStore.getState();

    // Clear existing visibility state
    pointLayerStore.clearAllVisibility();

    if (layerIds.length === 0) return;

    // Group layer IDs by map
    const layersByMap: Record<string, string[]> = {};
    for (const entry of layerIds) {
        const colonIndex = entry.indexOf(':');
        if (colonIndex === -1) continue;
        const mapId = entry.substring(0, colonIndex);
        const layerId = entry.substring(colonIndex + 1);
        if (!layersByMap[mapId]) layersByMap[mapId] = [];
        layersByMap[mapId].push(layerId);
    }

    // Set visibility per map
    for (const [mapId, ids] of Object.entries(layersByMap)) {
        pointLayerStore.setVisibleLayerIds(mapId, ids);
    }
}

/**
 * Initializes hazard layer visibility from URL
 */
function initializeHazardLayers(hazardIds: string[]): void {
    if (hazardIds.length === 0) return;

    const store = useHazardLayersStore.getState();
    store.setVisibleLayerIds(hazardIds);
}

/**
 * Initializes raster layer visibility from URL
 */
function initializeRasterLayers(rasterIds: string[]): void {
    if (rasterIds.length === 0) return;

    const store = useRasterLayersStore.getState();
    store.setVisibleLayerIds(rasterIds);
}