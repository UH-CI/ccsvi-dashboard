import { create } from 'zustand';
import type { RasterLayerConfig, SubRasterLayerConfig } from '../types';

interface RasterLayersState {
  // Core data
  rasterLayerConfigs: RasterLayerConfig[];
  rasterLayerData: Map<string, ArrayBuffer>;
  //visibleLayerIds: Set<string>;
  visibleLayerIdsByMap: Record<string, Set<string>>;
  isLoaded: boolean;

  // Loading and error states
  loading: boolean;
  error: string | null;
  loadingLayers: Set<string>;
  errorLayers: Map<string, string>;

  // Setters
  setRasterLayerConfigs: (configs: RasterLayerConfig[]) => void;
  setRasterLayerData: (layerId: string, data: ArrayBuffer) => void;
  //setVisibleLayerIds: (ids: string[]) => void;
  setVisibleLayerIds: (mapId: string, ids: string[]) => void;
  setIsLoaded: (loaded: boolean) => void;

  // Actions (mutual exclusivity: only one raster visible at a time)
  //toggleRasterLayerVisibility: (id: string) => void;
  toggleRasterLayerVisibility: (mapId: string, id: string) => void;
  //toggleSubRasterLayerVisibility: (parentId: string, subId: string) => void;
  toggleSubRasterLayerVisibility: (mapId: string, parentId: string, subId: string) => void;

  // Data fetching
  fetchRasterLayerConfigs: () => Promise<void>;
  fetchRasterLayerData: (layerId: string) => Promise<void>;
}

export const useRasterLayersStore = create<RasterLayersState>((set, get) => ({
  // Initial state
  rasterLayerConfigs: [],
  rasterLayerData: new Map(),
  //visibleLayerIds: new Set(),
  visibleLayerIdsByMap: {},
  isLoaded: false,
  loading: false,
  error: null,
  loadingLayers: new Set(),
  errorLayers: new Map(),

  // Setters
  setRasterLayerConfigs: (configs) => {
    set({ rasterLayerConfigs: configs });
  },

  setRasterLayerData: (layerId, data) => {
    set((state) => {
      const newData = new Map(state.rasterLayerData);
      newData.set(layerId, data);
      return { rasterLayerData: newData };
    });
  },

  // setVisibleLayerIds: (ids) => {
  //   set({ visibleLayerIds: new Set(ids) });
  // },
  setVisibleLayerIds: (mapId, ids) => {
      set((state) => ({
          visibleLayerIdsByMap: {
              ...state.visibleLayerIdsByMap,
              [mapId]: new Set(ids),
          }
      }))
  },

  setIsLoaded: (loaded) => {
    set({ isLoaded: loaded });
  },

  // Actions - Raster layers are mutually exclusive (only one visible at a time)
  // toggleRasterLayerVisibility: (id) => {
  //   const { rasterLayerConfigs, visibleLayerIds, setVisibleLayerIds, fetchRasterLayerData } = get();

  toggleRasterLayerVisibility: (mapId, id) => {
    const {
        rasterLayerConfigs,
        visibleLayerIdsByMap,
        setVisibleLayerIds,
        fetchRasterLayerData,
    } = get();
     

    const layer = rasterLayerConfigs.find(l => l.id === id);
    if (!layer) {
      console.warn(`Raster layer config not found: ${id}`);
      return;
    }

    // If layer has sublayers, don't toggle parent directly
    if (layer.subLayers?.length) return;

    // Check if this layer is currently visible for this map
    const mapVisibleLayers = visibleLayerIdsByMap[mapId] ?? new Set<string>();
    const isCurrentlyVisible = mapVisibleLayers.has(id);

    if (isCurrentlyVisible) {
      // Turn off - clear all visibility
      setVisibleLayerIds(mapId, []);
    } else {
      // Turn on - clear others and set only this one (mutual exclusivity)
      setVisibleLayerIds(mapId, [id]);
      fetchRasterLayerData(id);
    }
  },

  toggleSubRasterLayerVisibility: (mapId, parentId, subId) => {
    const { rasterLayerConfigs, visibleLayerIdsByMap, setVisibleLayerIds, fetchRasterLayerData } = get();

    const parentLayer = rasterLayerConfigs.find(l => l.id === parentId);
    if (!parentLayer?.subLayers) return;

    const subLayer = parentLayer.subLayers.find(s => s.id === subId);
    if (!subLayer) return;

    const fullSubId = `${parentId}.${subId}`;
    // Check if this sublayer is currently visible for this map
    const mapVisibleLayers = visibleLayerIdsByMap[mapId] ?? new Set<string>();
    const isCurrentlyVisible = mapVisibleLayers.has(fullSubId);

    if (isCurrentlyVisible) {
      // Turn off - clear all visibility
      setVisibleLayerIds(mapId, []);
    } else {
      // Turn on - clear others and set only this sublayer + parent (mutual exclusivity)
      setVisibleLayerIds(mapId, [parentId, fullSubId]);
      fetchRasterLayerData(fullSubId);
    }
  },

  // Data fetching
  fetchRasterLayerConfigs: async () => {
    const { isLoaded, setIsLoaded, visibleLayerIdsByMap, fetchRasterLayerData } = get();

    // Prevent duplicate loads
    if (isLoaded) return;

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
          subLayers: match?.subLayers.map(sub => ({
            ...sub,
            color: sub.color ?? raster.color ?? '#666666',
          })),
        };
      });

      set({ rasterLayerConfigs: linkedRasters, loading: false });
      setIsLoaded(true);

      // Fetch data for any layers already marked visible (e.g., from URL initialization)
      // Object.values(visibleLayerIdsByMap).forEach(layerId => {
      //   fetchRasterLayerData(layerId);
      // });
      Object.values(visibleLayerIdsByMap).forEach((layerSet) => {
        layerSet.forEach(fetchRasterLayerData);
      });
    } catch (err) {
      console.error('Error loading raster layers:', err);
      set({
        error: err instanceof Error ? err.message : 'Unknown error loading raster layers',
        loading: false,
      });
    }
  },

  fetchRasterLayerData: async (layerId) => {
    const { rasterLayerData, rasterLayerConfigs, setRasterLayerData, loadingLayers } = get();

    // Skip if already loaded
    if (rasterLayerData.has(layerId)) return;

    // Skip if currently loading
    if (loadingLayers.has(layerId)) return;

    // Look up filePath from configs
    let filePath: string | undefined;

    if (layerId.includes('.')) {
      // Sublayer: parse parent.child format
      const [parentId, ...subParts] = layerId.split('.');
      const subId = subParts.join('.');
      const parentLayer = rasterLayerConfigs.find(l => l.id === parentId);
      const subLayer = parentLayer?.subLayers?.find(s => s.id === subId);
      filePath = subLayer?.filePath;
    } else {
      // Parent layer
      const parentLayer = rasterLayerConfigs.find(l => l.id === layerId);
      // If parent has sublayers, don't fetch parent directly
      if (parentLayer?.subLayers?.length) return;
      filePath = parentLayer?.filePath;
    }

    if (!filePath) {
      console.warn(`Raster layer config not found: ${layerId}`);
      return;
    }

    // Mark as loading
    set(state => ({
      loadingLayers: new Set(state.loadingLayers).add(layerId),
      errorLayers: new Map(state.errorLayers).set(layerId, ''),
    }));

    try {
      const base = import.meta.env.BASE_URL || '';
      const fullPath =
        filePath.startsWith('http') || filePath.startsWith('/')
          ? filePath
          : `${base}${filePath}`;

      const response = await fetch(fullPath);

      if (!response.ok) {
        throw new Error(`Failed to load ${filePath}: ${response.statusText}`);
      }

      const ext = filePath.split('.').pop()?.toLowerCase();
      let arrayBuffer: ArrayBuffer;

      if (ext === 'zip') {
        // Handle ZIP files containing TIFF
        const JSZip = (await import('jszip')).default;
        const zip = await JSZip.loadAsync(await response.blob());
        const tifName = Object.keys(zip.files).find(f =>
          /\.(tif|tiff|geotiff)$/i.test(f)
        );
        if (!tifName) throw new Error('ZIP contains no TIFF');
        arrayBuffer = await zip.file(tifName)!.async('arraybuffer');
      } else {
        arrayBuffer = await response.arrayBuffer();
      }

      setRasterLayerData(layerId, arrayBuffer);

      // Clear loading state
      set(state => {
        const newLoadingLayers = new Set(state.loadingLayers);
        newLoadingLayers.delete(layerId);
        const newErrorLayers = new Map(state.errorLayers);
        newErrorLayers.delete(layerId);
        return { loadingLayers: newLoadingLayers, errorLayers: newErrorLayers };
      });

    } catch (err) {
      console.error(`Error loading raster layer data for ${layerId}:`, err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

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
export const useRasterLayerConfigs = () =>
  useRasterLayersStore(state => state.rasterLayerConfigs);

export const useIsRasterLayerVisible = (mapId: string, layerId: string) => 
  useRasterLayersStore(
    state => state.visibleLayerIdsByMap[mapId]?.has(layerId) ?? false
  );

export const useRasterLayerData = (layerId: string) =>
  useRasterLayersStore(state => state.rasterLayerData.get(layerId));