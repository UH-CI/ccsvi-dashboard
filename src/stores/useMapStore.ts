import { create } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { MapConfig } from "../types";

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

  // UI state
  expandedSectionsByMap: Record<
    string,
    {
      maps: boolean;
      utils: boolean;
      points: boolean;
      hazards: boolean;
      rasters: boolean;
      opacity: boolean;
    }
  >;

  // Actions
  addMap: () => void;
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

  // UI actions
  toggleSectionByMap: (
    mapId: string,
    section: "maps" | "utils" | "points" | "hazards" | "rasters" | "opacity",
  ) => void;

  // Reset
  reset: () => void;
}

export const DEFAULT_LAYER_OPACITIES = {
  census: 0.3,
  hawaiianHomelands: 0.3,
  countyBoundaries: 0.7,
} as const;

const initialMapConfig: MapConfig = {
  id: "map1",
  title: "Map 1",
  dataset: "",
  metric: "",
  visible: true,
  colorScheme: "Viridis",
  baseMap: "openstreet",
};

export const defaultExpandedSections = {
  maps: true,
  utils: true,
  points: false,
  hazards: false,
  rasters: false,
  opacity: false,
};

export const useMapStore = create<MapState>((set, get) => ({
  // Initial state
  mapConfigs: [initialMapConfig],
  nextMapId: 2,
  primaryMapId: initialMapConfig.id,
  layerOpacities: {
    [initialMapConfig.id]: { ...DEFAULT_LAYER_OPACITIES },
  },
  expandedSectionsByMap: { [initialMapConfig.id]: { ...defaultExpandedSections } },

  // Map config actions
  addMap: () => {
    const { nextMapId } = get();
    const newMapId = `map${nextMapId}`;
    const newMap: MapConfig = {
      id: newMapId,
      title: `Map ${nextMapId}`,
      dataset: "",
      metric: "",
      visible: true,
      colorScheme: "Viridis",
    };
    set((state) => ({
      mapConfigs: [...state.mapConfigs, newMap],
      nextMapId: state.nextMapId + 1,
      layerOpacities: {
        ...state.layerOpacities,
        [newMapId]: { ...DEFAULT_LAYER_OPACITIES },
      },
      expandedSectionsByMap: {
        ...state.expandedSectionsByMap,
        [newMapId]: { ...defaultExpandedSections },
      },
    }));
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
        const { [mapId]: _removed, ...restExpandedSections } = state.expandedSectionsByMap;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [mapId]: _removedOpacity, ...restOpacities } = state.layerOpacities;
        return {
          mapConfigs: remaining,
          primaryMapId: newPrimaryId,
          expandedSectionsByMap: restExpandedSections,
          layerOpacities: restOpacities,
        };
      });
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

  // UI actions
  toggleSectionByMap: (mapId, section) => {
    set((state) => ({
      expandedSectionsByMap: {
        ...state.expandedSectionsByMap,
        [mapId]: {
          ...state.expandedSectionsByMap[mapId],
          [section]: !state.expandedSectionsByMap[mapId]?.[section],
        },
      },
    }));
  },

  reset: () => {
    set({
      mapConfigs: [initialMapConfig],
      nextMapId: 2,
      primaryMapId: initialMapConfig.id,
      layerOpacities: {
        [initialMapConfig.id]: { ...DEFAULT_LAYER_OPACITIES },
      },
      expandedSectionsByMap: {
        [initialMapConfig.id]: { ...defaultExpandedSections },
      },
    });
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
