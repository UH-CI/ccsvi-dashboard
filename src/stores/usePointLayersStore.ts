import { create } from "zustand";
import { PointLayerConfig } from "../types";
import { POINT_LAYERS } from "../config/pointLayers";

interface PointLayerState {
  // Core data
  pointLayerConfigs: PointLayerConfig[];
  visibleLayerIdsByMap: Record<string, Set<string>>;

  // Setters
  setVisibleLayerIds: (mapId: string, ids: string[]) => void;

  // Actions
  toggleLayerVisibility: (mapId: string, layerId: string) => void;
  // Forgets everything kept for a map that's being removed
  clearMap: (mapId: string) => void;
}

export const usePointLayerStore = create<PointLayerState>((set, get) => ({
  // Initial state
  pointLayerConfigs: POINT_LAYERS,
  visibleLayerIdsByMap: {},

  // Setters
  setVisibleLayerIds: (mapId, ids) => {
    set((state) => ({
      visibleLayerIdsByMap: {
        ...state.visibleLayerIdsByMap,
        [mapId]: new Set(ids),
      },
    }));
  },

  // Actions
  toggleLayerVisibility: (mapId, layerId) => {
    const { pointLayerConfigs, visibleLayerIdsByMap, setVisibleLayerIds } = get();

    if (!pointLayerConfigs.some((l) => l.id === layerId)) {
      console.warn(`Point layer config not found: ${layerId}`);
      return;
    }

    const currentVisible = visibleLayerIdsByMap[mapId] ?? new Set();
    const newVisibleIds = new Set(currentVisible);

    if (newVisibleIds.has(layerId)) {
      newVisibleIds.delete(layerId);
    } else {
      newVisibleIds.add(layerId);
    }

    setVisibleLayerIds(mapId, Array.from(newVisibleIds));
  },

  clearMap: (mapId) => {
    set((state) => {
      const visibleLayerIdsByMap = { ...state.visibleLayerIdsByMap };
      delete visibleLayerIdsByMap[mapId];
      return { visibleLayerIdsByMap };
    });
  },
}));