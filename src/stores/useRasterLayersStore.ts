import { create } from 'zustand';
import type { RasterLayerConfig, SubRasterLayerConfig } from '../types';
import { RasterData } from '../components/RasterLayers/RasterData';

interface RasterLayersState {
  rasterLayers: RasterLayerConfig[];
  rasterData: Map<string, RasterData>; 
  loading: boolean;
  error: string | null;
  setRasterLayers: (layers: RasterLayerConfig[]) => void;
  toggleRasterLayerVisibility: (id: string, visible?: boolean) => void;
  toggleSubRasterLayerVisibility: (parentId: string, subId: string, visible?: boolean) => void;
  setRasterData: (layerId: string, data: RasterData) => void;
  getRasterData: (layerId: string) => RasterData | undefined;
  fetchRasterLayers: () => Promise<void>;
  clearAllRasters: () => void;
}

const disableAllExcept = (
  layers: RasterLayerConfig[],
  keep: { parentId: string; subId?: string }
): RasterLayerConfig[] =>
  layers.map(layer => {
    const isTargetParent = layer.id === keep.parentId;

    // Parent WITH sublayers
    if (layer.subLayers?.length) {
      const updatedSubs = layer.subLayers.map(sub => ({
        ...sub,
        visible: isTargetParent && sub.id === keep.subId,
      }));

      return {
        ...layer,
        subLayers: updatedSubs,
        visible: updatedSubs.some(s => s.visible),
      };
    }

    // Parent WITHOUT sublayers
    return {
      ...layer,
      visible: isTargetParent && !keep.subId,
    };
  });



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

  clearAllRasters: () => {
    set((state) => ({
      rasterLayers: state.rasterLayers.map(layer => ({
        ...layer,
        visible: false,
        subLayers: layer.subLayers?.map(sub => ({
          ...sub,
          visible: false,
        })),
      })),
    }));
  }, 

  toggleRasterLayerVisibility: (id, visible) => {
    set((state) => {
      const layer = state.rasterLayers.find(l => l.id === id);

      if (layer?.subLayers?.length) return state;

      const shouldEnable = visible ?? !layer?.visible;

      return {
        rasterLayers: shouldEnable
          ? disableAllExcept(state.rasterLayers, { parentId: id })
          : state.rasterLayers.map(l => ({ ...l, visible: false })),
      };
    });
  },

  toggleSubRasterLayerVisibility: (parentId, subId, visible) => {
    set((state) => {
      const parent = state.rasterLayers.find(l => l.id === parentId);
      if (!parent?.subLayers) return state;

      const sub = parent.subLayers.find(s => s.id === subId);
      const shouldEnable = visible ?? !sub?.visible;

      return {
        rasterLayers: shouldEnable
          ? disableAllExcept(state.rasterLayers, { parentId, subId })
          : state.rasterLayers.map(layer => ({
              ...layer,
              subLayers: layer.subLayers?.map(s => ({
                ...s,
                visible: false,
              })),
              visible: false,
            })),
      };
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

        return {
          ...raster,
          visible: false,
          subLayers: match?.subLayers.map(sub => ({
            ...sub,
            visible: false,
            color: sub.color ?? raster.color ?? '#666666',
          })),
        };
      });

      set({ rasterLayers: linkedRasters, loading: false });
    } catch (err) {
      console.error('Error loading raster layers:', err);
      set({
        error:
          err instanceof Error
            ? err.message
            : 'Unknown error loading raster layers',
        loading: false,
      });
    }
  },
}));

