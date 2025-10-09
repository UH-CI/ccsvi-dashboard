import { create } from 'zustand';
import { MapConfig } from '../types';

interface MapState {
  // Map configurations
  mapConfigs: MapConfig[];
  
  // Actions
  addMap: () => void;
  removeMap: (mapId: string) => void;
  updateMapConfig: (mapId: string, updates: Partial<MapConfig>) => void;
  toggleMapVisibility: (mapId: string) => void;
  updateMapActiveFeature: (mapId: string, activeFeature: MapConfig['activeFeature']) => void;
  
  // Reset
  reset: () => void;
}

const initialMapConfig: MapConfig = {
  id: 'map1',
  title: 'Map 1',
  dataset: '',
  metric: '',
  visible: true,
};

export const useMapStore = create<MapState>((set, get) => ({
  // Initial state
  mapConfigs: [initialMapConfig],

  // Map config actions
  addMap: () => {
    const { mapConfigs } = get();
    const newMapId = `map${mapConfigs.length + 1}`;
    const newMap: MapConfig = {
      id: newMapId,
      title: `Map ${mapConfigs.length + 1}`,
      dataset: '',
      metric: '',
      visible: true,
    };
    set({ mapConfigs: [...mapConfigs, newMap] });
  },

  removeMap: (mapId) => {
    const { mapConfigs } = get();
    if (mapConfigs.length > 1) {
      set({ mapConfigs: mapConfigs.filter(config => config.id !== mapId) });
    }
  },

  updateMapConfig: (mapId, updates) => {
    const { mapConfigs } = get();
    const newConfigs = mapConfigs.map(config => 
      config.id === mapId ? { ...config, ...updates } : config
    );
    set({ mapConfigs: newConfigs });
  },

  toggleMapVisibility: (mapId) => {
    const { mapConfigs } = get();
    const newConfigs = mapConfigs.map(config => 
      config.id === mapId ? { ...config, visible: !config.visible } : config
    );
    set({ mapConfigs: newConfigs });
  },

  updateMapActiveFeature: (mapId, activeFeature) => {
    const { mapConfigs } = get();
    const newConfigs = mapConfigs.map(config => 
      config.id === mapId ? { ...config, activeFeature } : config
    );
    set({ mapConfigs: newConfigs });
  },

  reset: () => {
    set({
      mapConfigs: [initialMapConfig],
    });
  },
}));

// Selectors for computed state
export const useVisibleMaps = () => {
  return useMapStore((state) => 
    state.mapConfigs.filter(config => config.visible)
  );
};

export const useMapConfig = (mapId: string) => {
  return useMapStore((state) => 
    state.mapConfigs.find(config => config.id === mapId)
  );
};
