import { create } from 'zustand';
import { FeatureCollection, Point } from 'geojson';
import { PointLayerConfig } from '../types';

interface PointLayerState {
    // Core data
    pointLayerConfigs: PointLayerConfig[];
    pointLayerData: Map<string, FeatureCollection<Point>>;
    visibleLayerIds: Set<string>;
    isLoaded: boolean;

    // Setters
    setPointLayerConfigs: (configs: PointLayerConfig[]) => void;
    setPointLayerData: (layerId: string, data: FeatureCollection<Point>) => void;
    setVisibleLayerIds: (ids: string[]) => void;
    setIsLoaded: (loaded: boolean) => void;

    // Actions
    toggleLayerVisibility: (layerId: string) => void;

    // Data fetching
    fetchPointLayerConfigs: (initialVisibleIds?: string[]) => Promise<void>;
    fetchPointLayerData: (layerId: string) => Promise<void>;
}

export const usePointLayerStore = create<PointLayerState>((set, get) => ({
    // Initial state
    pointLayerConfigs: [],
    pointLayerData: new Map(),
    visibleLayerIds: new Set(),
    isLoaded: false,

    // Setters
    setPointLayerConfigs: (configs) => {
        set({ pointLayerConfigs: configs });
    },

    setPointLayerData: (layerId, data) => {
        set((state) => {
            const newData = new Map(state.pointLayerData);
            newData.set(layerId, data);
            return { pointLayerData: newData };
        });
    },

    setVisibleLayerIds: (ids) => {
        set({ visibleLayerIds: new Set(ids) });
    },

    setIsLoaded: (loaded) => {
        set({ isLoaded: loaded });
    },

    // Actions
    toggleLayerVisibility: (layerId) => {
        const { visibleLayerIds, setVisibleLayerIds, fetchPointLayerData } = get();
        const newVisibleIds = new Set(visibleLayerIds);

        if (newVisibleIds.has(layerId)) {
            newVisibleIds.delete(layerId);
        } else {
            newVisibleIds.add(layerId);
            fetchPointLayerData(layerId);
        }

        setVisibleLayerIds(Array.from(newVisibleIds));
    },

    // Data fetching
    fetchPointLayerConfigs: async (initialVisibleIds = []) => {
        const { isLoaded, setPointLayerConfigs, setVisibleLayerIds, setIsLoaded } = get();

        // Prevent duplicate loads
        if (isLoaded) {
            return;
        }

        try {
            const response = await fetch(`${import.meta.env.BASE_URL}data/point_data/point_layers.json`);

            if (!response.ok) {
                throw new Error(`Failed to load point layers config: ${response.statusText}`);
            }

            const config = await response.json();
            const configs: PointLayerConfig[] = config.pointLayers || [];

            setPointLayerConfigs(configs);
            setVisibleLayerIds(initialVisibleIds);
            setIsLoaded(true);

        } catch (err) {
            console.error('Error loading point layers configuration:', err);
        }
    },

    fetchPointLayerData: async (layerId) => {
        const { pointLayerConfigs, pointLayerData, setPointLayerData } = get();

        // Skip if already loaded
        if (pointLayerData.has(layerId)) return;

        const layerConfig = pointLayerConfigs.find(l => l.id === layerId);
        if (!layerConfig) {
            console.warn(`Point layer config not found: ${layerId}`);
            return;
        }

        try {
            const url = `${import.meta.env.BASE_URL}${layerConfig.filePath}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Failed to load ${layerConfig.name}: ${response.statusText}`);
            }

            const data = await response.json();
            setPointLayerData(layerId, data);

        } catch (err) {
            console.error(`Error loading ${layerConfig.name} data:`, err);
        }
    },
}));

// Selector hooks
export const usePointLayerConfigs = () =>
    usePointLayerStore(state => state.pointLayerConfigs);

export const useIsLayerVisible = (layerId: string) =>
    usePointLayerStore(state => state.visibleLayerIds.has(layerId));