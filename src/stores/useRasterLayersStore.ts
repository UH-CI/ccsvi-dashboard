import { create } from 'zustand';
import type { RasterLayerConfig, SubRasterLayerConfig } from '../types';
import { RasterData } from '../components/RasterLayers/RasterData';

interface RasterLayersState {
  rasterLayers: RasterLayerConfig[];
  rasterData: Map<string, RasterData>; // Cache loaded raster data by layer ID
  loading: boolean;
  error: string | null;
  setRasterLayers: (layers: RasterLayerConfig[]) => void;
  toggleRasterLayerVisibility: (id: string, visible?: boolean) => void;
  toggleSubRasterLayerVisibility: (parentId: string, subId: string, visible?: boolean) => void;
  setRasterData: (layerId: string, data: RasterData) => void;
  getRasterData: (layerId: string) => RasterData | undefined;
  fetchRasterLayers: () => Promise<void>;
}

export const useRasterLayersStore = create<RasterLayersState>((set, get) => ({
  rasterLayers: [],
  rasterData: new Map(),
  loading: false,
  error: null,

  setRasterLayers: (layers) => set({ rasterLayers: layers }),

  setRasterData: (layerId, data) => {
    set((state) => {
      const newData = new Map(state.rasterData);
      newData.set(layerId, data);
      return { rasterData: newData };
    });
  },

  getRasterData: (layerId) => {
    return get().rasterData.get(layerId);
  },

  toggleRasterLayerVisibility: (id, visible) => {
    set((state) => {
      const updated = state.rasterLayers.map(layer => {
        if (layer.id === id) {
          const newVisible = visible ?? !layer.visible;
          const updatedSubs = layer.subLayers?.map(s => ({ ...s, visible: newVisible })) ?? [];
          return { ...layer, visible: newVisible, subLayers: updatedSubs };
        }
        return layer;
      });
      return { rasterLayers: updated };
    });
  },

  toggleSubRasterLayerVisibility: (parentId, subId, visible) => {
    set((state) => {
      const updatedLayers = state.rasterLayers.map((layer) => {
        if (layer.id === parentId && layer.subLayers) {
          const updatedSubLayers = layer.subLayers.map((sub) => {
            if (sub.id === subId) {
              return { ...sub, visible: visible ?? !sub.visible };
            }
            return sub;
          });

          // Determine if parent should stay on or off
          const anyVisible = updatedSubLayers.some((s) => s.visible);
          return { ...layer, subLayers: updatedSubLayers, visible: anyVisible };
        }
        return layer;
      });

      return { rasterLayers: updatedLayers };
    });
  },

  fetchRasterLayers: async () => {
    set({ loading: true, error: null });
    try {
      const base = import.meta.env.BASE_URL || '';
      const [rasterRes, subRasterRes] = await Promise.all([
        fetch(`${base}data/Rasters/raster_layer.json`),
        fetch(`${base}data/Rasters/sub_raster_layer.json`),
      ]);

      if (!rasterRes.ok || !subRasterRes.ok) {
        throw new Error('Failed to fetch raster layer configs');
      }

      const rasterJson = await rasterRes.json();
      const subRasterJson = await subRasterRes.json();

      const rasterLayersRaw: RasterLayerConfig[] =
        Array.isArray(rasterJson) ? rasterJson : rasterJson.rasterLayers || [];

      const subRasterLayersRaw: { id: string; subLayers: SubRasterLayerConfig[] }[] =
        Array.isArray(subRasterJson)
          ? subRasterJson
          : subRasterJson.subRasterLayers || [];

      const linkedRasters = rasterLayersRaw.map((raster) => {
        const match = subRasterLayersRaw.find((sub) => sub.id === raster.id);
        const subLayersWithColor = (match?.subLayers || []).map((sub) => ({
            ...sub,
            color: sub.color ?? raster.color ?? "#666666",
          }));
        return {
          ...raster,
          subLayers: match?.subLayers || [],
        };
      });

      set({ rasterLayers: linkedRasters, loading: false });
    } catch (err) {
      console.error('Error loading raster layers:', err);
      set({
        error: err instanceof Error ? err.message : 'Unknown error loading raster layers',
        loading: false,
      });
    }
  },
}));

