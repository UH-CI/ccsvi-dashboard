import { create } from 'zustand';
import { useShallow } from "zustand/react/shallow";
import { MapConfig } from '../types';

interface MapState {
  // Map configurations
  mapConfigs: MapConfig[];

  // Which map drives the TableViewer
  primaryMapId: string;

  // Map state
  primaryMapDataset: string;
  primaryMapMetric: string;

  // UI state
  expandedSections: {
      maps: boolean;
      utils: boolean;
      points: boolean;
      hazards: boolean;
      rasters: boolean;
  };
  expandedSectionsByMap: Record<
    string,
    {
      maps: boolean;
      utils: boolean;
      points: boolean;
      hazards: boolean;
      rasters: boolean;
    }
  >;

    // Actions
  addMap: () => void;
  removeMap: (mapId: string) => void;
  updateMapConfig: (mapId: string, updates: Partial<MapConfig>) => void;
  toggleMapVisibility: (mapId: string) => void;
  updateMapActiveFeature: (mapId: string, activeFeature: MapConfig['activeFeature']) => void;
  setPrimaryMap: (mapId: string) => void;
  setPrimaryMapDataset: (dataset: string) => void;
  setPrimaryMapMetric: (metric: string) => void;

  // UI actions
  toggleSection: (section: keyof MapState['expandedSections']) => void;
  toggleSectionByMap: (
    mapId: string,
    section: 'maps' | 'utils' | 'points' | 'hazards' | 'rasters'
  ) => void;
  
  // Reset
  reset: () => void;
}

const initialMapConfig: MapConfig = {
  id: 'map1',
  title: 'Map 1',
  dataset: '',
  metric: '',
  visible: true,
  colorScheme: 'viridis',
};

const initialExpandedSections: MapState['expandedSections'] = {
    maps: true,
    utils: true,
    points: true,
    hazards: true,
    rasters: true,
};

const defaultExpandedSections = {
  maps: true,
  utils: true,
  points: false,
  hazards: true,
  rasters: false,
};

export const useMapStore = create<MapState>((set, get) => ({
  // Initial state
  mapConfigs: [initialMapConfig],
    primaryMapId: initialMapConfig.id,
    primaryMapDataset: '',
    primaryMapMetric: '',
    expandedSections: initialExpandedSections,
    expandedSectionsByMap: {[initialMapConfig.id]: {...defaultExpandedSections}},

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
      colorScheme: 'viridis',
    };
    set((state) => ({
      mapConfigs: [...state.mapConfigs, newMap],
      expandedSectionsByMap: {
        ...state.expandedSectionsByMap,
        [newMapId]: { ...defaultExpandedSections },
      },
     }));
  },

  removeMap: (mapId) => {
    const { mapConfigs, primaryMapId } = get();
    if (mapConfigs.length > 1) {
      const remaining = mapConfigs.filter(config => config.id !== mapId);
      // If removing the primary map, fall back to first visible (or first overall)
      const newPrimaryId = mapId === primaryMapId
        ? (remaining.find(c => c.visible)?.id ?? remaining[0].id)
        : primaryMapId;
      set((state) => {
        const { [mapId]: _, ...rest } = state.expandedSectionsByMap;
        return {
          mapConfigs: remaining,
          primaryMapId: newPrimaryId,
          expandedSectionsByMap: rest,
        };
      });
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

  setPrimaryMap: (mapId) => {
    set({ primaryMapId: mapId });
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
        primaryMapId: initialMapConfig.id,
        primaryMapDataset: '',
        primaryMapMetric: '',
        expandedSections: initialExpandedSections,
        expandedSectionsByMap: {
          [initialMapConfig.id]: { ...defaultExpandedSections },
        },
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