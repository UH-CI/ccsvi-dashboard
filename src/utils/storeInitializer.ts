import { useMapStore, usePointLayerStore, useHazardLayersStore } from '../stores';
import { DeserializedState } from './urlSerializer';

/**
 * Initializes all stores from deserialized URL state
 * This should be called on app initialization or during browser navigation
 */
export function initializeStoresFromUrl(urlState: DeserializedState): void {
    initializeMapStore(urlState.mapConfigs);
    initializePointLayers(urlState.pointLayers);
    initializeHazardLayers(urlState.hazardLayers);
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
 */
function initializePointLayers(layerIds: string[]): void {
    if (layerIds.length === 0) return;

    const pointLayerStore = usePointLayerStore.getState();
    pointLayerStore.setVisibleLayerIds(layerIds);
}

/**
 * Initializes hazard layer visibility from URL
 */
function initializeHazardLayers(hazardIds: string[]): void {
    if (hazardIds.length === 0) return;

    const store = useHazardLayersStore.getState();
    store.setVisibleLayerIds(hazardIds);
}