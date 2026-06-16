import { create } from "zustand";
import { RASTER_LAYERS } from "../config/rasterLayers";
import type { RasterLayerConfig } from "../types";

export interface COGInfo {
  min: number;
  max: number;
  // Passed to L.tileLayer to prevent Leaflet requesting tiles outside the COG extent.
  bounds?: [[number, number], [number, number]]; // [[south, west], [north, east]]
}

export interface RasterLegendInfo {
  layerId: string;
  title: string;
  min: number;
  max: number;
  colormapName: string;
  units?: string;
}

/** Min/max + title for the on-map raster legend (mirrors active GeoTIFF color scale). */
export interface RasterLegendInfo {
  layerId: string;
  title: string;
  min: number;
  max: number;
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
  // Band min/max cached on first toggle-on; cleared only when the store resets
  cogInfoCache: Map<string, COGInfo>;
  // Per-map, per-layer colormap overrides set by the user via the colormap picker
  colormapOverrides: Record<string, Record<string, string>>;
  isLoaded: boolean;

  setVisibleLayerIds: (mapId: string, ids: string[]) => void;
  setRasterLegend: (mapId: string, info: RasterLegendInfo | null) => void;
  setIsLoaded: (loaded: boolean) => void;
  setCOGInfo: (layerId: string, info: COGInfo) => void;
  setRasterColormap: (mapId: string, layerId: string, colormapName: string) => void;

  // Actions (mutual exclusivity: only one raster visible at a time)
  toggleRasterLayerVisibility: (mapId: string, id: string) => void;
  toggleSubRasterLayerVisibility: (mapId: string, parentId: string, subId: string) => void;

  // Data fetching
  fetchRasterLayerConfigs: () => void;
  fetchCOGInfo: (layerId: string) => Promise<void>;
}

export const useRasterLayersStore = create<RasterLayersState>((set, get) => ({
  // Initial state
  rasterLayerConfigs: [],
  visibleLayerIdsByMap: {},
  rasterLegendByMap: {},
  cogInfoCache: new Map(),
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

  setCOGInfo: (layerId, info) => {
    set((state) => {
      const next = new Map(state.cogInfoCache);
      next.set(layerId, info);
      return { cogInfoCache: next };
    });
  },

  setRasterColormap: (mapId, layerId, colormapName) => {
    set((state) => ({
      colormapOverrides: {
        ...state.colormapOverrides,
        [mapId]: { ...(state.colormapOverrides[mapId] ?? {}), [layerId]: colormapName },
      },
    }));
  },

  toggleRasterLayerVisibility: (mapId, id) => {
    const { rasterLayerConfigs, visibleLayerIdsByMap, setVisibleLayerIds, fetchCOGInfo } = get();
    const layer = rasterLayerConfigs.find((l) => l.id === id);
    if (!layer || layer.subLayers?.length) return;

    // Check if this layer is currently visible for this map
    const isVisible = visibleLayerIdsByMap[mapId]?.has(id) ?? false;
    if (isVisible) {
      setVisibleLayerIds(mapId, []);
    } else {
      setVisibleLayerIds(mapId, [id]);
      fetchCOGInfo(id);
    }
  },

  toggleSubRasterLayerVisibility: (mapId, parentId, subId) => {
    const { rasterLayerConfigs, visibleLayerIdsByMap, setVisibleLayerIds, fetchCOGInfo } = get();
    const parent = rasterLayerConfigs.find((l) => l.id === parentId);
    if (!parent?.subLayers?.find((s) => s.id === subId)) return;

    const fullId = `${parentId}.${subId}`;
    const isVisible = visibleLayerIdsByMap[mapId]?.has(fullId) ?? false;
    if (isVisible) {
      setVisibleLayerIds(mapId, []);
    } else {
      setVisibleLayerIds(mapId, [parentId, fullId]);
      fetchCOGInfo(fullId);
    }
  },

  // Synchronous — imports directly from the typed TS module, no network request.
  fetchRasterLayerConfigs: () => {
    if (get().isLoaded) return;
    set({ rasterLayerConfigs: RASTER_LAYERS, isLoaded: true });
  },

  fetchCOGInfo: async (layerId) => {
    const { cogInfoCache, setCOGInfo } = get();
    if (cogInfoCache.has(layerId)) return;

    try {
      // Fetch statistics (min/max for rescale) and bounds (to constrain tile requests) in parallel.
      const [statsRes, boundsRes] = await Promise.all([
        fetch(`/api/tiles/cog/statistics?raster_id=${encodeURIComponent(layerId)}`),
        fetch(`/api/tiles/cog/info?raster_id=${encodeURIComponent(layerId)}`),
      ]);
      if (!statsRes.ok) return;
      const data = await statsRes.json();
      // TiTiler returns bands keyed by "b1", "b2", etc. Fall back to first key for robustness.
      const band = data.b1 ?? Object.values(data)[0];
      if (band?.min == null || band?.max == null) return;

      // TiTiler bounds are [west, south, east, north]; convert to Leaflet [[south, west], [north, east]].
      let bounds: [[number, number], [number, number]] | undefined;
      if (boundsRes.ok) {
        const boundsData = await boundsRes.json();
        const [west, south, east, north] = boundsData.bounds;
        bounds = [[south, west], [north, east]];
      }

      setCOGInfo(layerId, { min: band.min as number, max: band.max as number, bounds });
    } catch (err) {
      console.error(`[useRasterLayersStore] fetchCOGInfo failed for ${layerId}:`, err);
    }
  },
}));

export const useIsRasterLayerVisible = (mapId: string, layerId: string) =>
  useRasterLayersStore((state) => state.visibleLayerIdsByMap[mapId]?.has(layerId) ?? false);