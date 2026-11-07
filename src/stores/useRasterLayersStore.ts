import { useMemo } from "react";
import { create } from "zustand";
import { RASTER_LAYERS } from "../config/rasterLayers";
import type { RasterLayerConfig, SubRasterLayerConfig } from "../types";
import { useHCDPStore } from "./useHCDPStore";

interface RasterLayersState {
  // Core data
  rasterLayerConfigs: RasterLayerConfig[];
  visibleLayerIdsByMap: Record<string, Set<string>>;
  // Per-map, per-layer colormap overrides set by the user via the colormap picker
  colormapOverrides: Record<string, Record<string, string>>;
  isLoaded: boolean;

  setVisibleLayerIds: (mapId: string, ids: string[]) => void;
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

// A raster's config from its id, "<parent>" or "<parent>.<sub>"; an unknown sub-layer gives the parent
export function rasterConfig(
  id: string,
  configs: RasterLayerConfig[],
): RasterLayerConfig | SubRasterLayerConfig | null {
  const [parentId, subId] = id.split(".");
  const parent = configs.find((layer) => layer.id === parentId);
  if (!parent) return null;
  return subId ? (parent.subLayers?.find((layer) => layer.id === subId) ?? parent) : parent;
}

// The colour bar a raster is drawn with on one map: the user's pick, else its own, else its parent's
export function rasterColormap(
  id: string,
  configs: RasterLayerConfig[],
  overrides: Record<string, string> | undefined,
): string | undefined {
  const parentId = id.split(".")[0];
  return (
    overrides?.[id] ??
    rasterConfig(id, configs)?.colormap ??
    configs.find((layer) => layer.id === parentId)?.colormap
  );
}

export interface ActiveRaster {
  id: string;
  config: RasterLayerConfig | SubRasterLayerConfig | null;
  colormap: string | undefined;
}

// The raster a map reports on: a visible sub-layer if there is one, else the first visible layer
export function getActiveRaster(
  visibleIds: Set<string> | undefined,
  configs: RasterLayerConfig[],
  overrides: Record<string, string> | undefined,
): ActiveRaster | null {
  const ids = Array.from(visibleIds ?? []);
  const id = ids.find((candidate) => candidate.includes(".")) ?? ids[0];
  if (!id) return null;
  return {
    id,
    config: rasterConfig(id, configs),
    colormap: rasterColormap(id, configs, overrides),
  };
}

// One map's active raster, kept the same object until its layers, configs or colour pick change
export function useActiveRaster(mapId: string): ActiveRaster | null {
  const visibleIds = useRasterLayersStore((s) => s.visibleLayerIdsByMap[mapId]);
  const configs = useRasterLayersStore((s) => s.rasterLayerConfigs);
  const overrides = useRasterLayersStore((s) => s.colormapOverrides[mapId]);
  return useMemo(
    () => getActiveRaster(visibleIds, configs, overrides),
    [visibleIds, configs, overrides],
  );
}