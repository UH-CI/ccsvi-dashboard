import {
  useMapStore,
  usePointLayerStore,
  useHazardLayersStore,
  useRasterLayersStore,
} from "../stores";
import { DeserializedState } from "./urlSerializer";

/**
 * Initializes all stores from deserialized URL state
 * This should be called on app initialization or during browser navigation
 */
export function initializeStoresFromUrl(urlState: DeserializedState): void {
  initializeMapStore(urlState.mapConfigs, urlState.primaryMapId);
  initializePointLayers(urlState.pointLayers);
  initializeHazardLayers(urlState.hazardLayers);
  initializeRasterLayers(urlState.rasterLayers);
}

/**
 * Initializes map store from URL
 */
function initializeMapStore(
  mapConfigs: DeserializedState["mapConfigs"],
  primaryMapId?: string,
): void {
  const mapStore = useMapStore.getState();
  mapStore.reset();
  // The link's ids are kept, so layers listed for e.g. "map6" still match
  mapStore.loadMaps(
    mapConfigs.map((config) => ({ ...config, id: config.id! })),
    primaryMapId,
  );
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
    const colonIndex = entry.indexOf(":");
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

  const layersByMap: Record<string, string[]> = {};
  for (const entry of hazardIds) {
    const colonIndex = entry.indexOf(":");
    if (colonIndex === -1) continue;
    const mapId = entry.substring(0, colonIndex);
    const layerId = entry.substring(colonIndex + 1);
    if (!layersByMap[mapId]) layersByMap[mapId] = [];
    layersByMap[mapId].push(layerId);
  }

  // Set visibility per map
  const store = useHazardLayersStore.getState();
  store.setVisibleLayerIdsByMap(layersByMap);
}

/**
 * Initializes raster layer visibility from URL
 * rasterIds are in "mapId:layerId" format (e.g. ["map1:rainfall.annual", "map2:elevation"])
 */
function initializeRasterLayers(rasterIds: string[]): void {
  const store = useRasterLayersStore.getState();

  if (rasterIds.length === 0) return;

  // Group layer IDs by map
  const layersByMap: Record<string, string[]> = {};
  for (const entry of rasterIds) {
    const colonIndex = entry.indexOf(":");
    if (colonIndex === -1) continue;
    const mapId = entry.substring(0, colonIndex);
    const layerId = entry.substring(colonIndex + 1);
    if (!layersByMap[mapId]) layersByMap[mapId] = [];
    layersByMap[mapId].push(layerId);
  }

  // Set visibility per map
  for (const [mapId, ids] of Object.entries(layersByMap)) {
    store.setVisibleLayerIds(mapId, ids);
  }
}
