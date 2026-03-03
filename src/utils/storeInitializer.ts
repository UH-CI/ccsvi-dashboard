import {
  useMapStore,
  usePointLayerStore,
  useHazardLayersStore,
  useRasterLayersStore,
  defaultExpandedSections,
  DEFAULT_LAYER_OPACITIES,
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

  // If no maps in URL, use default from reset()
  if (mapConfigs.length === 0) {
    if (primaryMapId) {
      mapStore.setPrimaryMap(primaryMapId);
    }
    return;
  }

  // Build full MapConfig objects preserving original IDs from the URL.
  // This ensures rasters/layers that reference e.g. "map6" still match.
  const fullConfigs = mapConfigs.map((config) => ({
    id: config.id!,
    title: `Map ${config.id!.replace("map", "")}`,
    dataset: config.dataset || "",
    metric: config.metric || "",
    visible: config.visible ?? true,
    colorScheme: "viridis" as const,
    ...(config.activeFeature ? { activeFeature: config.activeFeature } : {}),
  }));

  const expandedSectionsByMap = fullConfigs.reduce(
    (acc, config) => {
      acc[config.id] = { ...defaultExpandedSections };
      return acc;
    },
    {} as Record<string, typeof defaultExpandedSections>,
  );

  const layerOpacities = fullConfigs.reduce(
    (acc, config) => {
      acc[config.id] = { ...DEFAULT_LAYER_OPACITIES };
      return acc;
    },
    {} as Record<string, { census: number; hawaiianHomelands: number; countyBoundaries: number }>,
  );

  // Set nextMapId above the highest URL map number to prevent future collisions
  const maxMapNum = fullConfigs.reduce((max, config) => {
    const num = parseInt(config.id.replace("map", ""), 10);
    return isNaN(num) ? max : Math.max(max, num);
  }, 1);

  useMapStore.setState({
    mapConfigs: fullConfigs,
    nextMapId: maxMapNum + 1,
    expandedSectionsByMap,
    layerOpacities,
  });

  if (primaryMapId) {
    mapStore.setPrimaryMap(primaryMapId);
  }
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
