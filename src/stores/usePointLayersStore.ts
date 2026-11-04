import { create } from "zustand";
import { FeatureCollection, Point } from "geojson";
import { PointLayerConfig } from "../types";
import { POINT_LAYERS } from "../config/pointLayers";

interface PointLayerState {
  // Core data
  pointLayerConfigs: PointLayerConfig[];
  pointLayerData: Map<string, FeatureCollection<Point>>;
  visibleLayerIdsByMap: Record<string, Set<string>>;
  isLoaded: boolean;

  loadingLayers: Set<string>;

  // Setters
  setPointLayerData: (layerId: string, data: FeatureCollection<Point>) => void;
  setVisibleLayerIds: (mapId: string, ids: string[]) => void;

  // Actions
  toggleLayerVisibility: (mapId: string, layerId: string) => void;
  clearAllVisibility: () => void;

  // Data fetching
  fetchPointLayerConfigs: () => Promise<void>;
  fetchPointLayerData: (layerId: string) => Promise<void>;
}

export const usePointLayerStore = create<PointLayerState>((set, get) => ({
  // Initial state
  pointLayerConfigs: POINT_LAYERS,
  pointLayerData: new Map(),
  visibleLayerIdsByMap: {},
  isLoaded: false,
  loadingLayers: new Set(),

  // Setters
  setPointLayerData: (layerId, data) => {
    set((state) => {
      const newData = new Map(state.pointLayerData);
      newData.set(layerId, data);
      return { pointLayerData: newData };
    });
  },

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
    const { pointLayerConfigs, visibleLayerIdsByMap, setVisibleLayerIds, fetchPointLayerData } =
      get();

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
      fetchPointLayerData(layerId);
    }

    setVisibleLayerIds(mapId, Array.from(newVisibleIds));
  },

  clearAllVisibility: () => {
    set({ visibleLayerIdsByMap: {} });
  },

  // Data fetching
  // Configs come from the TS import — this just handles layers already visible from URL state.
  fetchPointLayerConfigs: async () => {
    const { isLoaded, visibleLayerIdsByMap, fetchPointLayerData } = get();
    if (isLoaded) return;
    set({ isLoaded: true });
    Object.values(visibleLayerIdsByMap).forEach((layerSet) => {
      layerSet.forEach(fetchPointLayerData);
    });
  },

  fetchPointLayerData: async (layerId) => {
    const { pointLayerConfigs, pointLayerData, setPointLayerData, loadingLayers } = get();

    // Skip if already loaded or currently loading
    if (pointLayerData.has(layerId)) return;
    if (loadingLayers.has(layerId)) return;

    const layerConfig = pointLayerConfigs.find((l) => l.id === layerId);
    if (!layerConfig) {
      console.warn(`Point layer config not found: ${layerId}`);
      return;
    }

    set((state) => ({
      loadingLayers: new Set(state.loadingLayers).add(layerId),
    }));

    try {
      const DATA_BASE = import.meta.env.VITE_DATA_BASE_URL ?? "";
      const url = `${DATA_BASE}/point_data/${layerConfig.filePath}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to load ${layerConfig.name}: ${response.statusText}`);
      }

      const data = await response.json();
      setPointLayerData(layerId, data);

      set((state) => {
        const newLoadingLayers = new Set(state.loadingLayers);
        newLoadingLayers.delete(layerId);
        return { loadingLayers: newLoadingLayers };
      });
    } catch (err) {
      console.error(`Error loading ${layerConfig.name} data:`, err);

      set((state) => {
        const newLoadingLayers = new Set(state.loadingLayers);
        newLoadingLayers.delete(layerId);
        return { loadingLayers: newLoadingLayers };
      });
    }
  },
}));