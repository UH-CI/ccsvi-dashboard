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

    const parentIds = new Set<string>();
    const childMap = new Map<string, string[]>();

    hazardIds.forEach((id) => {
        if (id.includes('.')) {
            const [parentId, ...childParts] = id.split('.');
            const childId = childParts.join('.');

            parentIds.add(parentId);

            if (!childMap.has(parentId)) {
                childMap.set(parentId, []);
            }
            childMap.get(parentId)!.push(childId);
        } else {
            parentIds.add(id);
        }
    });

    // Build the complete set of visible IDs
    const visibleIds = new Set<string>();

    // Add all parent IDs
    parentIds.forEach((parentId) => {
        visibleIds.add(parentId);
    });

    // Add all child IDs with full path
    childMap.forEach((children, parentId) => {
        children.forEach((childId) => {
            visibleIds.add(`${parentId}.${childId}`);
        });
    });

    // Set all visible IDs at once
    store.setVisibleLayerIds(Array.from(visibleIds));

    // Fetch data for all visible layers
    parentIds.forEach((parentId) => {
        const layer = store.hazardLayerConfigs.find(l => l.id === parentId);
        if (layer?.filePath) {
            store.fetchHazardLayerData(parentId, layer.filePath);
        }

        // Fetch child layer data
        const childIds = childMap.get(parentId) || [];
        childIds.forEach((childId) => {
            const subLayer = layer?.subLayers?.find(s => s.id === childId);
            if (subLayer?.filePath) {
                store.fetchHazardLayerData(subLayer.id, subLayer.filePath);
            }
        });
    });
}