import { create } from 'zustand';
import type { HazardLayerConfig, SubHazardLayerConfig } from '../types';

interface HazardLayersState {
  hazardLayers: HazardLayerConfig[];
  loading: boolean;
  error: string | null;
  setHazardLayers: (layers: HazardLayerConfig[]) => void;
  toggleHazardLayerVisibility: (id: string, visible?: boolean) => void;
  toggleSubLayerVisibility: (parentId: string, subId: string, visible?: boolean) => void;
  fetchHazardLayers: () => Promise<void>;
}

export const useHazardLayersStore = create<HazardLayersState>((set, get) => ({
  hazardLayers: [],
  loading: false,
  error: null,

  setHazardLayers: (layers) => set({ hazardLayers: layers }),

  toggleHazardLayerVisibility: (id, visible) => {
    set((state) => {
      const updated = state.hazardLayers.map(layer => {
        if (layer.id === id) {
          const newVisible = visible ?? !layer.visible;
          const updatedSubs = layer.subLayers?.map(s => ({ ...s, visible: newVisible })) ?? [];
          return { ...layer, visible: newVisible, subLayers: updatedSubs };
        }
        return layer;
      });
      return { hazardLayers: updated };
    });
  },

  toggleSubLayerVisibility: (parentId, subId, visible) => {
    set((state) => {
      const updatedLayers = state.hazardLayers.map((layer) => {
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

      return { hazardLayers: updatedLayers };
    });
  },

  fetchHazardLayers: async () => {
    set({ loading: true, error: null });
    try {
      const base = import.meta.env.BASE_URL || '';
      const [hazardRes, subHazardRes] = await Promise.all([
        fetch(`${base}data/Hazards/Hazard_layers.json`),
        fetch(`${base}data/Hazards/Sub_Hazard_layers.json`),
      ]);

      if (!hazardRes.ok || !subHazardRes.ok) {
        throw new Error('Failed to fetch hazard layer configs');
      }

      const hazardJson = await hazardRes.json();
      const subHazardJson = await subHazardRes.json();

      const hazardLayersRaw: HazardLayerConfig[] =
        Array.isArray(hazardJson) ? hazardJson : hazardJson.hazardLayers || [];

      const subHazardLayersRaw: { id: string; subLayers: SubHazardLayerConfig[] }[] =
        Array.isArray(subHazardJson)
          ? subHazardJson
          : subHazardJson.subHazardLayers || [];

      const linkedHazards = hazardLayersRaw.map((hazard) => {
        const match = subHazardLayersRaw.find((sub) => sub.id === hazard.id);
        const subLayersWithColor = (match?.subLayers || []).map((sub) => ({
            ...sub,
            color: sub.color ?? hazard.color ?? "#cc0000", // ← fallback chain
          }));
        return {
          ...hazard,
          subLayers: match?.subLayers || [],
        };
      });

      set({ hazardLayers: linkedHazards, loading: false });
    } catch (err) {
      console.error('Error loading hazard layers:', err);
      set({
        error: err instanceof Error ? err.message : 'Unknown error loading hazard layers',
        loading: false,
      });
    }
  },
}));