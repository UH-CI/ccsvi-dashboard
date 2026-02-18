import { create } from 'zustand';
import { FeatureCollection, Geometry } from 'geojson';
import type { HazardLayerConfig, SubHazardLayerConfig } from '../types';

interface HazardLayersState {
    // Core data
    hazardLayerConfigs: HazardLayerConfig[];
    hazardLayerData: Map<string, FeatureCollection<Geometry> | ArrayBuffer>;
    //visibleLayerIds: Set<string>;
    visibleLayerIdsByMap: Record<string, Set<string>>;
    isLoaded: boolean;

    // Setters
    setHazardLayerConfigs: (layers: HazardLayerConfig[]) => void;
    setHazardLayerData: (layerId: string, data: FeatureCollection<Geometry> | ArrayBuffer) => void;
    setVisibleLayerIds: (mapId: string, ids: string[]) => void;
    setIsLoaded: (loaded: boolean) => void;

    // Actions
    //toggleHazardLayerVisibility: (id: string) => void;
    toggleHazardLayerVisibility: (mapId: string, id: string) => void;
    //toggleSubLayerVisibility: (parentId: string, subId: string) => void;
    toggleSubLayerVisibility: (mapId: string, parentId: string, subId: string) => void;

    // Data fetching
    fetchHazardLayerConfigs: () => Promise<void>;
    fetchHazardLayerData: (layerId: string) => Promise<void>;

    loading: boolean;
    error: string | null;
}

export const useHazardLayersStore = create<HazardLayersState>((set, get) => ({
    // Initial state
    hazardLayerConfigs: [],
    hazardLayerData: new Map(),
    //visibleLayerIds: new Set(),
    visibleLayerIdsByMap: {},
    isLoaded: false,
    loading: false,
    error: null,

    // Setters
    setHazardLayerConfigs: (configs) => {
        set({ hazardLayerConfigs: configs });
    },

    setHazardLayerData: (layerId, data) => {
        set((state) => {
            const newData = new Map(state.hazardLayerData);
            newData.set(layerId, data);
            return { hazardLayerData: newData };
        });
    },

    // setVisibleLayerIds: (ids) => {
    //     set({ visibleLayerIds: new Set(ids) });
    // },
    setVisibleLayerIds: (mapId, ids) => {
        set((state) => ({
            visibleLayerIdsByMap: {
                ...state.visibleLayerIdsByMap,
                [mapId]: new Set(ids),
            },
        }));
    },
    // Prevent duplicate loading
    setIsLoaded: (loaded) => {
        set({ isLoaded: loaded });
    },


    // Actions
    toggleHazardLayerVisibility: (mapId, id) => {
        const { visibleLayerIdsByMap, setVisibleLayerIds, hazardLayerConfigs, fetchHazardLayerData } = get();
        const newVisibleIds = visibleLayerIdsByMap[mapId] ?? new Set<string>();

        const layer = hazardLayerConfigs.find(l => l.id === id);
        if (!layer) return;

        if (newVisibleIds.has(id)) {
            // Hide parent and all sublayers
            newVisibleIds.delete(id);
            layer.subLayers?.forEach(sub => newVisibleIds.delete(`${id}.${sub.id}`));
        } else {
            // Show parent and all sublayers
            newVisibleIds.add(id);

            if (layer.filePath) {
                fetchHazardLayerData(id);
            }

            layer.subLayers?.forEach(sub => {
                const fullSubId = `${id}.${sub.id}`;
                newVisibleIds.add(fullSubId);
                fetchHazardLayerData(fullSubId);
            });
        }

        setVisibleLayerIds(mapId, Array.from(newVisibleIds));
    },

    toggleSubLayerVisibility: (mapId, parentId, subId) => {
        const { visibleLayerIdsByMap, setVisibleLayerIds, hazardLayerConfigs, fetchHazardLayerData } = get();
        const newVisibleIds = visibleLayerIdsByMap[mapId] ?? new Set<string>();

        const parentLayer = hazardLayerConfigs.find(l => l.id === parentId);
        if (!parentLayer?.subLayers) return;

        const subLayer = parentLayer.subLayers.find(s => s.id === subId);
        if (!subLayer) return;

        const fullSubId = `${parentId}.${subId}`;

        if (newVisibleIds.has(fullSubId)) {
            // Hide this sublayer
            newVisibleIds.delete(fullSubId);

            // If no sublayers are visible, hide parent too
            const anySubVisible = parentLayer.subLayers.some(s =>
                s.id !== subId && newVisibleIds.has(`${parentId}.${s.id}`)
            );
            if (!anySubVisible) {
                newVisibleIds.delete(parentId);
            }
        } else {
            // Show this sublayer and ensure parent is visible
            newVisibleIds.add(fullSubId);
            newVisibleIds.add(parentId);

            // Fetch data if needed
            fetchHazardLayerData(fullSubId);
        }

        setVisibleLayerIds(mapId, Array.from(newVisibleIds));
    },

    fetchHazardLayerConfigs: async () => {
        const { isLoaded, setIsLoaded } = get();

        // Prevent duplicate loads
        if (isLoaded) {
            return;
        }

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
                    color: sub.color ?? hazard.color ?? "#cc0000",
                }));
                return {
                    ...hazard,
                    subLayers: subLayersWithColor,
                };
            });

            set({ hazardLayerConfigs: linkedHazards, loading: false });
            setIsLoaded(true);

            // Fetch data for any layers already marked visible (e.g., from URL initialization)
            const { visibleLayerIdsByMap } = get();
            Object.values(visibleLayerIdsByMap).forEach((layerSet) => {
                layerSet.forEach(layerId => get().fetchHazardLayerData(layerId));
            });
        } catch (err) {
            console.error('Error loading hazard layers:', err);
            set({
                error: err instanceof Error ? err.message : 'Unknown error loading hazard layers',
                loading: false,
            });
        }
    },

    fetchHazardLayerData: async (layerId) => {
        const { hazardLayerData, hazardLayerConfigs, setHazardLayerData } = get();

        // Skip if already loaded
        if (hazardLayerData.has(layerId)) return;

        // Look up filePath from configs
        // Sublayer IDs use "parentId.subId" format for uniqueness
        let filePath: string | undefined;

        if (layerId.includes('.')) {
            // Sublayer: parse parent.child format
            const [parentId, ...subParts] = layerId.split('.');
            const subId = subParts.join('.');
            const parentLayer = hazardLayerConfigs.find(l => l.id === parentId);
            const subLayer = parentLayer?.subLayers?.find(s => s.id === subId);
            filePath = subLayer?.filePath;
        } else {
            // Parent layer
            const parentLayer = hazardLayerConfigs.find(l => l.id === layerId);
            if (parentLayer?.subLayers?.length) return;
            filePath = parentLayer?.filePath;
        }

        if (!filePath) {
            console.warn(`Hazard layer config not found: ${layerId}`);
            return;
        }

        const ext = filePath.split('.').pop()?.toLowerCase();

        try {
            const response = await fetch(filePath);

            if (!response.ok) {
                throw new Error(`Failed to load ${filePath}: ${response.statusText}`);
            }

            if (["json", "geojson"].includes(ext!)) {
                const data = await response.json();
                setHazardLayerData(layerId, data);
            } else if (["tif", "tiff", "geotiff"].includes(ext!)) {
                const arrayBuffer = await response.arrayBuffer();
                setHazardLayerData(layerId, arrayBuffer);
            }

        } catch (err) {
            console.error(`Error loading hazard layer data for ${layerId}:`, err);
        }
    },
}));

// Selector hooks
export const useHazardLayerConfigs = () =>
    useHazardLayersStore(state => state.hazardLayerConfigs);

export const useIsHazardLayerVisible = (mapId: string, layerId: string) =>
    useHazardLayersStore(state => state.visibleLayerIdsByMap[mapId]?.has(layerId) ?? false);

export const useHazardLayerData = (layerId: string) =>
    useHazardLayersStore(state => state.hazardLayerData.get(layerId));