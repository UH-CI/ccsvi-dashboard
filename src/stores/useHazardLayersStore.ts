import { create } from "zustand";
import type { HazardLayerConfig } from "../types";
import { HAZARD_LAYERS } from "../config/hazardLayers";

interface HazardLayersState {
  // Core data
  hazardLayerConfigs: HazardLayerConfig[];
  visibleLayerIdsByMap: Record<string, Set<string>>;
  isLoaded: boolean;

  // Setters
  setVisibleLayerIds: (mapId: string, ids: string[]) => void;
  setVisibleLayerIdsByMap: (byMap: Record<string, string[]>) => void;

  // Actions
  toggleHazardLayerVisibility: (mapId: string, id: string) => void;
  toggleSubLayerVisibility: (mapId: string, parentId: string, subId: string) => void;

  // Initialization — configs come from TS import; this handles URL-initialized visible layers
  fetchHazardLayerConfigs: () => Promise<void>;
}

export const useHazardLayersStore = create<HazardLayersState>((set, get) => ({
  // Initial state
  hazardLayerConfigs: HAZARD_LAYERS,
  visibleLayerIdsByMap: {},
  isLoaded: false,

  // Setters
  setVisibleLayerIds: (mapId, ids) => {
    set((state) => ({
      visibleLayerIdsByMap: {
        ...state.visibleLayerIdsByMap,
        [mapId]: new Set(ids),
      },
    }));
  },

  setVisibleLayerIdsByMap: (byMap) => {
    const visibleLayerIdsByMap: Record<string, Set<string>> = {};
    for (const [mapId, ids] of Object.entries(byMap)) {
      visibleLayerIdsByMap[mapId] = new Set(ids);
    }
    set({ visibleLayerIdsByMap });
  },

  // Actions
  toggleHazardLayerVisibility: (mapId, id) => {
    const { visibleLayerIdsByMap, setVisibleLayerIds, hazardLayerConfigs } = get();
    const newVisibleIds = new Set(visibleLayerIdsByMap[mapId] ?? new Set<string>());

    const layer = hazardLayerConfigs.find((l) => l.id === id);
    if (!layer) return;

    if (newVisibleIds.has(id)) {
      // Hide parent and all sublayers
      newVisibleIds.delete(id);
      layer.subLayers?.forEach((sub) => newVisibleIds.delete(`${id}.${sub.id}`));
    } else {
      // Show parent and all sublayers — PMTiles fetching handled by the renderer
      newVisibleIds.add(id);
      layer.subLayers?.forEach((sub) => {
        newVisibleIds.add(`${id}.${sub.id}`);
      });
    }

    setVisibleLayerIds(mapId, Array.from(newVisibleIds));
  },

  toggleSubLayerVisibility: (mapId, parentId, subId) => {
    const { visibleLayerIdsByMap, setVisibleLayerIds, hazardLayerConfigs } = get();
    const newVisibleIds = new Set(visibleLayerIdsByMap[mapId] ?? new Set<string>());

    const parentLayer = hazardLayerConfigs.find((l) => l.id === parentId);
    if (!parentLayer?.subLayers) return;

    const subLayer = parentLayer.subLayers.find((s) => s.id === subId);
    if (!subLayer) return;

    const fullSubId = `${parentId}.${subId}`;

    if (newVisibleIds.has(fullSubId)) {
      newVisibleIds.delete(fullSubId);

      const anySubVisible = parentLayer.subLayers.some(
        (s) => s.id !== subId && newVisibleIds.has(`${parentId}.${s.id}`),
      );
      if (!anySubVisible) {
        newVisibleIds.delete(parentId);
      }
    } else {
      // Show sublayer and ensure parent is visible — PMTiles fetching handled by the renderer
      newVisibleIds.add(fullSubId);
      newVisibleIds.add(parentId);
    }

    setVisibleLayerIds(mapId, Array.from(newVisibleIds));
  },

  fetchHazardLayerConfigs: async () => {
    const { isLoaded } = get();
    if (isLoaded) return;
    set({ isLoaded: true });
    // Configs come from the TS import — no async work needed.
    // URL-initialized visible layers are rendered immediately by HazardLayerRenderer
    // once it sees isVisible = true and constructs the PMTiles URL from config.
  },
}));

// Selector hooks
export const useHazardLayerConfigs = () =>
  useHazardLayersStore((state) => state.hazardLayerConfigs);

export const useIsHazardLayerVisible = (mapId: string, layerId: string) =>
  useHazardLayersStore((state) => state.visibleLayerIdsByMap[mapId]?.has(layerId) ?? false);