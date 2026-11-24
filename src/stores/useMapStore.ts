import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { LayerOpacities, MapState } from "../types";
import { DEFAULT_BASE_MAP_ID } from "../config/basemaps";
import { DEFAULT_COLOR_SCHEME } from "../config/colorSchemes";
import { useMapLayersStore } from "./useMapLayersStore";
import { useFilterStore } from "./useFilterStore";

interface MapStoreState {
  // The maps
  maps: MapState[];
  nextMapId: number;

  // Which map drives the TableViewer
  primaryMapId: string;

  // Actions
  addMap: () => void;
  // Replaces the maps with ones read from a link; no maps keeps the current ones
  loadMaps: (configs: (Partial<MapState> & { id: string })[], primaryMapId?: string) => void;
  removeMap: (mapId: string) => void;
  updateMap: (mapId: string, updates: Partial<MapState>) => void;
  toggleMapVisibility: (mapId: string) => void;
  updateMapActiveFeature: (mapId: string, activeFeature: MapState["activeFeature"]) => void;
  setPrimaryMap: (mapId: string) => void;
  setLayerOpacity: (mapId: string, layer: keyof LayerOpacities, opacity: number) => void;

  // Hack to pass reset value to maps
  resets: number;
  reset: () => void;
}

const DEFAULT_LAYER_OPACITIES: LayerOpacities = {
  census: 0.3,
  hawaiianHomelands: 0.3,
  countyBoundaries: 0.7,
};

// A new map's settings; the one place they're written
export const newMapState = (id: string): MapState => ({
  id,
  title: `Map ${id.replace("map", "")}`,
  metric: "",
  visible: true,
  colorScheme: DEFAULT_COLOR_SCHEME,
  baseMap: DEFAULT_BASE_MAP_ID,
  opacities: { ...DEFAULT_LAYER_OPACITIES },
});

// One fresh map, as on first load and after Reset View
const startingMaps = () => ({
  maps: [newMapState("map1")],
  nextMapId: 2,
  primaryMapId: "map1",
});

export const useMapStore = create<MapStoreState>((set, get) => ({
  // Initial state
  ...startingMaps(),
  resets: 0,

  // Map actions
  addMap: () => {
    const { nextMapId } = get();
    set((state) => ({
      maps: [...state.maps, newMapState(`map${nextMapId}`)],
      nextMapId: state.nextMapId + 1,
    }));
  },

  loadMaps: (configs, primaryMapId) => {
    if (configs.length > 0) {
      const maps = configs.map((config) => ({ ...newMapState(config.id), ...config }));
      // Above the highest map number in the link, so a new map never takes an existing id
      const highest = Math.max(1, ...maps.map((c) => parseInt(c.id.replace("map", ""), 10)));
      set({ maps, nextMapId: highest + 1 });
    }
    if (primaryMapId) set({ primaryMapId });
  },

  removeMap: (mapId) => {
    const { maps, primaryMapId } = get();
    if (maps.length > 1) {
      const remaining = maps.filter((config) => config.id !== mapId);
      // If removing the primary map, fall back to first visible (or first overall)
      const newPrimaryId =
        mapId === primaryMapId
          ? (remaining.find((c) => c.visible)?.id ?? remaining[0].id)
          : primaryMapId;
      set({ maps: remaining, primaryMapId: newPrimaryId });
      useMapLayersStore.getState().clearMap(mapId);
    }
  },

  updateMap: (mapId, updates) => {
    const { maps } = get();
    const newConfigs = maps.map((config) =>
      config.id === mapId ? { ...config, ...updates } : config,
    );
    set({ maps: newConfigs });
  },

  toggleMapVisibility: (mapId) => {
    const { maps } = get();
    const newConfigs = maps.map((config) =>
      config.id === mapId ? { ...config, visible: !config.visible } : config,
    );
    set({ maps: newConfigs });
  },

  updateMapActiveFeature: (mapId, activeFeature) => {
    const { maps } = get();
    const newConfigs = maps.map((config) =>
      config.id === mapId ? { ...config, activeFeature } : config,
    );
    set({ maps: newConfigs });
  },

  setPrimaryMap: (mapId) => {
    set({ primaryMapId: mapId });
  },

  setLayerOpacity: (mapId, layer, opacity) => {
    const { opacities } = get().maps.find((config) => config.id === mapId)!;
    get().updateMap(mapId, { opacities: { ...opacities, [layer]: opacity } });
  },

  reset: () => {
    get().maps.forEach((config) => useMapLayersStore.getState().clearMap(config.id));
    useFilterStore.getState().clear();
    set((state) => ({ ...startingMaps(), resets: state.resets + 1 }));
  },
}));

// The main map's indicator and comparison indicator, as one key
const indicatorKey = ({ maps, primaryMapId }: MapStoreState) => {
  const primary = maps.find((c) => c.id === primaryMapId);
  return [primaryMapId, primary?.metric, primary?.metric2].join("|");
};

// A Data Analyzer filter and its sliders belong to one indicator: a new one on the main map starts them over
useMapStore.subscribe((state, previous) => {
  if (indicatorKey(state) !== indicatorKey(previous)) useFilterStore.getState().clear();
});

// Selectors for computed state
export const useVisibleMaps = () => {
  return useMapStore(useShallow((state) => state.maps.filter((config) => config.visible)));
};

export const useMapState = (mapId: string) => {
  return useMapStore((state) => state.maps.find((config) => config.id === mapId));
};

export const usePrimaryMapState = () => {
  return useMapStore(
    useShallow((state) => {
      const primary = state.maps.find((c) => c.id === state.primaryMapId);
      return {
        metric: primary?.metric ?? "",
        activeFeature: primary?.activeFeature,
      };
    }),
  );
};
