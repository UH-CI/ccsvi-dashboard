import { create } from "zustand";
import { RASTER_LAYERS } from "../config/rasterLayers";
import type { RasterLayerConfig } from "../types";
import { useHCDPStore } from "./useHCDPStore";

export interface RasterLegendInfo {
  layerId: string;
  title: string;
  min: number;
  max: number;
  colormapName: string;
  units?: string;
  legendWidthPx?: number;
  legendGradientHeightPx?: number;
}

interface RasterLayersState {
  // Core data
  rasterLayerConfigs: RasterLayerConfig[];
  visibleLayerIdsByMap: Record<string, Set<string>>;
  // Per-map legend payload when a raster is visible; cleared when layer hides.
  rasterLegendByMap: Record<string, RasterLegendInfo | null>;
  // Per-map, per-layer colormap overrides set by the user via the colormap picker
  colormapOverrides: Record<string, Record<string, string>>;
  isLoaded: boolean;

  setVisibleLayerIds: (mapId: string, ids: string[]) => void;
  setRasterLegend: (mapId: string, info: RasterLegendInfo | null) => void;
  setIsLoaded: (loaded: boolean) => void;
  setRasterColormap: (mapId: string, layerId: string, colormapName: string) => void;

  // Actions (mutual exclusivity: only one raster visible at a time)
  toggleRasterLayerVisibility: (mapId: string, id: string) => void;
  toggleSubRasterLayerVisibility: (mapId: string, parentId: string, subId: string) => void;

  // Data fetching
  fetchRasterLayerConfigs: () => void;
}

export const useRasterLayersStore = create<RasterLayersState>((set, get) => ({
  // Initial state
  rasterLayerConfigs: [],
  visibleLayerIdsByMap: {},
  rasterLegendByMap: {},
  colormapOverrides: {},
  isLoaded: false,

  setVisibleLayerIds: (mapId, ids) => {
    set((state) => ({
      visibleLayerIdsByMap: {
        ...state.visibleLayerIdsByMap,
        [mapId]: new Set(ids),
      },
    }));
  },

  setRasterLegend: (mapId, info) => {
    set((state) => ({
      rasterLegendByMap: { ...state.rasterLegendByMap, [mapId]: info },
    }));
  },

  setIsLoaded: (loaded) => set({ isLoaded: loaded }),

  setRasterColormap: (mapId, layerId, colormapName) => {
    set((state) => ({
      colormapOverrides: {
        ...state.colormapOverrides,
        [mapId]: { ...(state.colormapOverrides[mapId] ?? {}), [layerId]: colormapName },
      },
    }));
  },

  toggleRasterLayerVisibility: (mapId, id) => {
    const { rasterLayerConfigs, visibleLayerIdsByMap, setVisibleLayerIds } = get();
    const layer = rasterLayerConfigs.find((l) => l.id === id);
    if (!layer || layer.subLayers?.length) return;

    const isVisible = visibleLayerIdsByMap[mapId]?.has(id) ?? false;
    if (isVisible) {
      setVisibleLayerIds(mapId, []);
    } else {
      useHCDPStore.getState().clearRasterOverlay(mapId);
      setVisibleLayerIds(mapId, [id]);
    }
  },

  toggleSubRasterLayerVisibility: (mapId, parentId, subId) => {
    const { rasterLayerConfigs, visibleLayerIdsByMap, setVisibleLayerIds } = get();
    const parent = rasterLayerConfigs.find((l) => l.id === parentId);
    if (!parent?.subLayers?.find((s) => s.id === subId)) return;

    const fullId = `${parentId}.${subId}`;
    const isVisible = visibleLayerIdsByMap[mapId]?.has(fullId) ?? false;
    if (isVisible) {
      setVisibleLayerIds(mapId, []);
    } else {
      useHCDPStore.getState().clearRasterOverlay(mapId);
      setVisibleLayerIds(mapId, [parentId, fullId]);
    }
  },

  // Synchronous — imports directly from the typed TS module, no network request.
  fetchRasterLayerConfigs: () => {
    if (get().isLoaded) return;
    set({ rasterLayerConfigs: RASTER_LAYERS, isLoaded: true });
  },
}));