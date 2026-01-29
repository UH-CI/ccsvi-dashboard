import { create } from 'zustand';
import { FeatureCollection, Point } from 'geojson';
import { PointLayerConfig } from '../types';

interface PointLayerState {
    // Core data
    pointLayerConfigs: PointLayerConfig[];
    pointLayerData: Map<string, FeatureCollection<Point>>;
    visibleLayerIds: Set<string>;
    isLoaded: boolean;

    // Loading and error states
    loading: boolean;
    error: string | null;
    loadingLayers: Set<string>;
    errorLayers: Map<string, string>;

    // Setters
    setPointLayerConfigs: (configs: PointLayerConfig[]) => void;
    setPointLayerData: (layerId: string, data: FeatureCollection<Point>) => void;
    setVisibleLayerIds: (ids: string[]) => void;
    setIsLoaded: (loaded: boolean) => void;

    // Actions
    toggleLayerVisibility: (layerId: string) => void;

    // Data fetching
    fetchPointLayerConfigs: () => Promise<void>;
    fetchPointLayerData: (layerId: string) => Promise<void>;
}

export const usePointLayerStore = create<PointLayerState>((set, get) => ({
    // Initial state
    pointLayerConfigs: [],
    pointLayerData: new Map(),
    visibleLayerIds: new Set(),
    isLoaded: false,
    loading: false,
    error: null,
    loadingLayers: new Set(),
    errorLayers: new Map(),

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
        const { pointLayerConfigs, visibleLayerIds, setVisibleLayerIds, fetchPointLayerData } = get();

        // Validate layer exists
        if (!pointLayerConfigs.some(l => l.id === layerId)) {
            console.warn(`Point layer config not found: ${layerId}`);
            return;
        }

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
    fetchPointLayerConfigs: async () => {
        const { isLoaded, visibleLayerIds, setPointLayerConfigs, setIsLoaded, fetchPointLayerData } = get();

        // Prevent duplicate loads
        if (isLoaded) {
            return;
        }

        set({ loading: true, error: null });
        try {
            const response = await fetch(`${import.meta.env.BASE_URL}data/point_data/point_layers.json`);

            if (!response.ok) {
                throw new Error(`Failed to load point layers config: ${response.statusText}`);
            }

            const config = await response.json();
            const configs: PointLayerConfig[] = config.pointLayers || [];

            setPointLayerConfigs(configs);
            setIsLoaded(true);
            set({ loading: false });

            // Fetch data for any layers already marked visible (e.g., from URL initialization)
            visibleLayerIds.forEach(layerId => {
                fetchPointLayerData(layerId);
            });

        } catch (err) {
            console.error('Error loading point layers configuration:', err);
            set({
                error: err instanceof Error ? err.message : 'Unknown error loading point layers',
                loading: false,
            });
        }
    },

    fetchPointLayerData: async (layerId) => {
        const { pointLayerConfigs, pointLayerData, setPointLayerData, loadingLayers, errorLayers } = get();

        // Skip if already loaded
        if (pointLayerData.has(layerId)) return;

        // Skip if currently loading
        if (loadingLayers.has(layerId)) return;

        const layerConfig = pointLayerConfigs.find(l => l.id === layerId);
        if (!layerConfig) {
            console.warn(`Point layer config not found: ${layerId}`);
            return;
        }

        // Mark as loading
        set(state => ({
            loadingLayers: new Set(state.loadingLayers).add(layerId),
            errorLayers: new Map(state.errorLayers).set(layerId, ''), // Clear previous error
        }));

        try {
            const url = `${import.meta.env.BASE_URL}${layerConfig.filePath}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Failed to load ${layerConfig.name}: ${response.statusText}`);
            }

            const data = await response.json();
            setPointLayerData(layerId, data);

            // Clear loading state
            set(state => {
                const newLoadingLayers = new Set(state.loadingLayers);
                newLoadingLayers.delete(layerId);
                const newErrorLayers = new Map(state.errorLayers);
                newErrorLayers.delete(layerId);
                return { loadingLayers: newLoadingLayers, errorLayers: newErrorLayers };
            });

        } catch (err) {
            console.error(`Error loading ${layerConfig.name} data:`, err);
            const errorMessage = err instanceof Error ? err.message : 'Unknown error';

            // Set error state
            set(state => {
                const newLoadingLayers = new Set(state.loadingLayers);
                newLoadingLayers.delete(layerId);
                const newErrorLayers = new Map(state.errorLayers);
                newErrorLayers.set(layerId, errorMessage);
                return { loadingLayers: newLoadingLayers, errorLayers: newErrorLayers };
            });
        }
    },
}));

// Selector hooks
export const usePointLayerConfigs = () =>
    usePointLayerStore(state => state.pointLayerConfigs);

export const useIsLayerVisible = (layerId: string) =>
    usePointLayerStore(state => state.visibleLayerIds.has(layerId));

export const usePointLayerData = (layerId: string) =>
    usePointLayerStore(state => state.pointLayerData.get(layerId));