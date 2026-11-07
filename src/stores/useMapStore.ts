import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { MapConfig } from "../types";
import { DEFAULT_BASE_MAP_ID } from "../config/basemaps";
import { DEFAULT_COLOR_SCHEME } from "../config";
import { usePointLayerStore } from "./usePointLayersStore";
import { useHazardLayersStore } from "./useHazardLayersStore";
import { useRasterLayersStore } from "./useRasterLayersStore";
import { useHCDPStore } from "./useHCDPStore";

interface MapState {
  // Map configurations
  mapConfigs: MapConfig[];
  nextMapId: number;

  // Which map drives the TableViewer
  primaryMapId: string;

  // Layer opacity per map
  layerOpacities: Record<
    string,
    {
      census: number;
      hawaiianHomelands: number;
      countyBoundaries: number;
    }
  >;

  // Actions
  addMap: () => void;
  // Replaces the maps with ones read from a link; no maps keeps the current ones
  loadMaps: (configs: (Partial<MapConfig> & { id: string })[], primaryMapId?: string) => void;
  removeMap: (mapId: string) => void;
  updateMapConfig: (mapId: string, updates: Partial<MapConfig>) => void;
  toggleMapVisibility: (mapId: string) => void;
  updateMapActiveFeature: (mapId: string, activeFeature: MapConfig["activeFeature"]) => void;
  setPrimaryMap: (mapId: string) => void;
  setLayerOpacity: (
    mapId: string,
    layerType: "census" | "hawaiianHomelands" | "countyBoundaries",
    opacity: number,
  ) => void;

  // Reset
  reset: () => void;
}

export const DEFAULT_LAYER_OPACITIES = {
  census: 0.3,
  hawaiianHomelands: 0.3,
  countyBoundaries: 0.7,
} as const;

// A new map's settings; the one place they're written
export const newMapConfig = (id: string): MapConfig => ({
  id,
  title: `Map ${id.replace("map", "")}`,
  dataset: "",
  metric: "",
  visible: true,
  colorScheme: DEFAULT_COLOR_SCHEME,
  baseMap: DEFAULT_BASE_MAP_ID,
});

// Clears what every other store keeps for one map, so a later map with the same id starts clean
function forgetMap(mapId: string) {
  usePointLayerStore.getState().clearMap(mapId);
  useHazardLayersStore.getState().clearMap(mapId);
  useRasterLayersStore.getState().clearMap(mapId);
  useHCDPStore.getState().clearRasterOverlay(mapId);
}

// One fresh map, as on first load and after Reset View
const startingMaps = () => ({
  mapConfigs: [newMapConfig("map1")],
  nextMapId: 2,
  primaryMapId: "map1",
  layerOpacities: { map1: { ...DEFAULT_LAYER_OPACITIES } },
});

export const useMapStore = create<MapState>((set, get) => ({
  // Initial state
  ...startingMaps(),

  // Map config actions
  addMap: () => {
    const { nextMapId } = get();
    const newMap = newMapConfig(`map${nextMapId}`);
    set((state) => ({
      mapConfigs: [...state.mapConfigs, newMap],
      nextMapId: state.nextMapId + 1,
      layerOpacities: {
        ...state.layerOpacities,
        [newMap.id]: { ...DEFAULT_LAYER_OPACITIES },
      },
    }));
  },

  loadMaps: (configs, primaryMapId) => {
    if (configs.length > 0) {
      const mapConfigs = configs.map((config) => ({ ...newMapConfig(config.id), ...config }));
      // Above the highest map number in the link, so a new map never takes an existing id
      const highest = Math.max(1, ...mapConfigs.map((c) => parseInt(c.id.replace("map", ""), 10)));
      set({
        mapConfigs,
        nextMapId: highest + 1,
        layerOpacities: Object.fromEntries(
          mapConfigs.map((c) => [c.id, { ...DEFAULT_LAYER_OPACITIES }]),
        ),
      });
    }
    if (primaryMapId) set({ primaryMapId });
  },

  removeMap: (mapId) => {
    const { mapConfigs, primaryMapId } = get();
    if (mapConfigs.length > 1) {
      const remaining = mapConfigs.filter((config) => config.id !== mapId);
      // If removing the primary map, fall back to first visible (or first overall)
      const newPrimaryId =
        mapId === primaryMapId
          ? (remaining.find((c) => c.visible)?.id ?? remaining[0].id)
          : primaryMapId;
      set((state) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [mapId]: _removedOpacity, ...restOpacities } = state.layerOpacities;
        return {
          mapConfigs: remaining,
          primaryMapId: newPrimaryId,
          layerOpacities: restOpacities,
        };
      });
      forgetMap(mapId);
    }
  },

  updateMapConfig: (mapId, updates) => {
    const { mapConfigs } = get();
    const newConfigs = mapConfigs.map((config) =>
      config.id === mapId ? { ...config, ...updates } : config,
    );
    set({ mapConfigs: newConfigs });
  },

  toggleMapVisibility: (mapId) => {
    const { mapConfigs } = get();
    const newConfigs = mapConfigs.map((config) =>
      config.id === mapId ? { ...config, visible: !config.visible } : config,
    );
    set({ mapConfigs: newConfigs });
  },

  updateMapActiveFeature: (mapId, activeFeature) => {
    const { mapConfigs } = get();
    const newConfigs = mapConfigs.map((config) =>
      config.id === mapId ? { ...config, activeFeature } : config,
    );
    set({ mapConfigs: newConfigs });
  },

  setPrimaryMap: (mapId) => {
    set({ primaryMapId: mapId });
  },

  setLayerOpacity: (mapId, layerType, opacity) => {
    set((state) => ({
      layerOpacities: {
        ...state.layerOpacities,
        [mapId]: {
          ...state.layerOpacities[mapId],
          [layerType]: opacity,
        },
      },
    }));
  },

  reset: () => {
    get().mapConfigs.forEach((config) => forgetMap(config.id));
    set(startingMaps());
  },
}));

// Selectors for computed state
export const useVisibleMaps = () => {
  return useMapStore(useShallow((state) => state.mapConfigs.filter((config) => config.visible)));
};

export const useMapConfig = (mapId: string) => {
  return useMapStore((state) => state.mapConfigs.find((config) => config.id === mapId));
};

export const usePrimaryMapState = () => {
  return useMapStore(
    useShallow((state) => {
      const primary = state.mapConfigs.find((c) => c.id === state.primaryMapId);
      return {
        dataset: primary?.dataset ?? "",
        metric: primary?.metric ?? "",
        activeFeature: primary?.activeFeature,
      };
    }),
  );
};
