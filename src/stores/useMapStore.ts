import { create } from 'zustand';
import { useShallow } from "zustand/react/shallow";
import { MapConfig } from '../types';

interface MapState {
  // Map configurations
  mapConfigs: MapConfig[];

  // Map state
  primaryMapDataset: string;
  primaryMapMetric: string;

  // UI state
  expandedSections: {
      maps: boolean;
      vulnerability: boolean;
      points: boolean;
  };

    // Actions
  addMap: () => void;
  removeMap: (mapId: string) => void;
  updateMapConfig: (mapId: string, updates: Partial<MapConfig>) => void;
  toggleMapVisibility: (mapId: string) => void;
  updateMapActiveFeature: (mapId: string, activeFeature: MapConfig['activeFeature']) => void;
  setPrimaryMapDataset: (dataset: string) => void;
  setPrimaryMapMetric: (metric: string) => void;

  // UI actions
  toggleSection: (section: keyof MapState['expandedSections']) => void;
  
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

const initialExpandedSections: MapState['expandedSections'] = {
    maps: true,
    vulnerability: true,
    points: true,
};

export const useMapStore = create<MapState>((set, get) => ({
  // Initial state
  mapConfigs: [initialMapConfig],
    primaryMapDataset: '',
    primaryMapMetric: '',
    expandedSections: initialExpandedSections,

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

    setPrimaryMapDataset: (dataset) => {
        set({ primaryMapDataset: dataset, primaryMapMetric: '' });
    },

    setPrimaryMapMetric: (metric) => {
        set({ primaryMapMetric: metric });
    },

    // UI actions
    toggleSection: (section) => {
      set((state) => ({
          expandedSections: {
            ...state.expandedSections,
            [section]: !state.expandedSections[section]
          }
      }))
    },

  reset: () => {
    set({
      mapConfigs: [initialMapConfig],
        primaryMapDataset: '',
        primaryMapMetric: '',
        expandedSections: initialExpandedSections,

    });
  },
}));

// Selectors for computed state
export const useVisibleMaps = () => {
  return useMapStore(useShallow((state) =>
    state.mapConfigs.filter(config => config.visible)
  ));
};

export const useMapConfig = (mapId: string) => {
  return useMapStore((state) => 
    state.mapConfigs.find(config => config.id === mapId)
  );
};

export const usePrimaryMapState = () => {
    return useMapStore(useShallow((state) => ({
        dataset: state.primaryMapDataset,
        metric: state.primaryMapMetric,
        setDataset: state.setPrimaryMapDataset,
        setMetric: state.setPrimaryMapMetric,
    })));
};