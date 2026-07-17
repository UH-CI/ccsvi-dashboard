import { create } from "zustand";
import { DATASETS_CONFIG, DataSourceKey, DataSourceTypeMap } from "../config";
import { GeographiesData, MetricValue, Dataset, PointLayerConfig, DatasetCatalog } from "../types";
import { getMetricValues, getDatasets } from "../api/client";
import { FeatureCollection, Geometry } from "geojson";
import {
  BlockGroupProperties,
  HawaiianHomelandProperties,
  CountyBoundariesProperties,
} from "../types";
import { HazardLayerConfig } from "../types";
import { useHazardLayersStore } from "./useHazardLayersStore";

interface LoadingState {
  geographiesData: boolean;
  blockGroupData: boolean;
  censusBlockGroups: boolean;
  hawaiianHomelands: boolean;
  countyBoundaries: boolean;
  pointLayers: boolean;
  hazardLayers: boolean;
}

interface ErrorState {
  [key: string]: string | null;
}

interface AppState {
  // Data
  geographiesData: GeographiesData | null;
  metricValuesCache: Record<string, Record<string, MetricValue>>;
  datasetCatalog: DatasetCatalog | null;
  filterRange: [number, number] | null;
  setFilterRange: (range: [number, number] | null) => void;
  blockGroupData: Dataset | null;
  censusBlockGroups: FeatureCollection<Geometry, BlockGroupProperties> | null;
  hawaiianHomelands: FeatureCollection<Geometry, HawaiianHomelandProperties> | null;
  countyBoundaries: FeatureCollection<Geometry, CountyBoundariesProperties> | null;
  pointLayers: PointLayerConfig[];
  hazardLayers: HazardLayerConfig[];

  loading: LoadingState;
  errors: ErrorState;

  // Setters
  setGeographiesData: (data: GeographiesData) => void;
  setBlockGroupData: (data: Dataset) => void;
  setCensusBlockGroups: (data: FeatureCollection<Geometry, BlockGroupProperties>) => void;
  setHawaiianHomelands: (data: FeatureCollection<Geometry, HawaiianHomelandProperties>) => void;
  setCountyBoundaries: (data: FeatureCollection<Geometry, CountyBoundariesProperties>) => void;
  setPointLayers: (data: PointLayerConfig[]) => void;
  setHazardLayers: (data: HazardLayerConfig[]) => void;

  setLoading: (key: keyof LoadingState, loading: boolean) => void;
  setError: (key: string, error: string | null) => void;

  // Data fetching
  fetchGeographiesData: () => Promise<void>;
  fetchMetricValues: (dataset: string, metric: string) => Promise<void>;
  fetchDatasetCatalog: () => Promise<void>;
  fetchBlockGroupData: () => Promise<void>;
  fetchCensusBlockGroups: () => Promise<void>;
  fetchHawaiianHomelands: () => Promise<void>;
  fetchCountyBoundaries: () => Promise<void>;
  fetchHazardLayers: () => Promise<void>;
  fetchAllData: () => Promise<void>;
}

const initialLoadingState: LoadingState = {
  geographiesData: false,
  blockGroupData: false,
  censusBlockGroups: false,
  hawaiianHomelands: false,
  countyBoundaries: false,
  pointLayers: false,
  hazardLayers: false,
};

const initialErrorState: ErrorState = {};

const fetchingMetrics = new Set<string>();
let fetchingDatasetCatalog = false;

export const useAppStore = create<AppState>((set, get) => {
  const fetchData = async <K extends DataSourceKey>(
    key: K,
    setter: (data: DataSourceTypeMap[K]) => void,
  ): Promise<void> => {
    const config = DATASETS_CONFIG[key];
    const { loading, setLoading, setError } = get();

    if (loading[key as keyof LoadingState]) return;

    setLoading(key as keyof LoadingState, true);
    setError(key, null);

    try {
      const response = await fetch(config.path);
      if (!response.ok) throw new Error(`${config.errorPrefix}: ${response.status}`);
      const data = (await response.json()) as DataSourceTypeMap[K];
      setter(data);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : config.errorPrefix;
      setError(key, errorMessage);
      console.error(`${config.errorPrefix}:`, error);
    } finally {
      setLoading(key as keyof LoadingState, false);
    }
  };

  return {
    // Initial state
    geographiesData: null,
    metricValuesCache: {},
    datasetCatalog: null,
    filterRange: null,
    setFilterRange: (range) => set({ filterRange: range }),
    blockGroupData: null,
    censusBlockGroups: null,
    hawaiianHomelands: null,
    countyBoundaries: null,
    pointLayers: [],
    hazardLayers: [],
    loading: initialLoadingState,
    errors: initialErrorState,

    // Setters
    setGeographiesData: (data) => set({ geographiesData: data }),
    setBlockGroupData: (data) => set({ blockGroupData: data }),
    setCensusBlockGroups: (data) => set({ censusBlockGroups: data }),
    setHawaiianHomelands: (data) => set({ hawaiianHomelands: data }),
    setCountyBoundaries: (data) => set({ countyBoundaries: data }),
    setPointLayers: (data) => set({ pointLayers: data }),
    setHazardLayers: (data) => set({ hazardLayers: data }),

    setLoading: (key, loading) =>
      set((state) => ({
        loading: { ...state.loading, [key]: loading },
      })),

    setError: (key, error) =>
      set((state) => ({
        errors: { ...state.errors, [key]: error },
      })),

    // Data fetching
    fetchGeographiesData: () => {
      const { setGeographiesData } = get();
      return fetchData("geographiesData", setGeographiesData);
    },
    fetchMetricValues: async (dataset: string, metric: string) => {
      const cacheKey = `${dataset}::${metric}`;
      if (get().metricValuesCache[cacheKey] !== undefined) return;
      if (fetchingMetrics.has(cacheKey)) return;
      fetchingMetrics.add(cacheKey);
      try {
        const data = await getMetricValues(dataset, metric);
        set((state) => ({
          metricValuesCache: { ...state.metricValuesCache, [cacheKey]: data },
        }));
      } catch (err) {
        console.error(`Failed to fetch metric values for ${dataset}::${metric}:`, err);
      } finally {
        fetchingMetrics.delete(cacheKey);
      }
    },
    fetchDatasetCatalog: async () => {
      if (get().datasetCatalog !== null) return;
      if (fetchingDatasetCatalog) return;
      fetchingDatasetCatalog = true;
      try {
        const data = await getDatasets();
        set({ datasetCatalog: data });
      } catch (err) {
        console.error("Failed to fetch dataset catalog:", err);
      } finally {
        fetchingDatasetCatalog = false;
      }
    },
    fetchBlockGroupData: () => {
      const { setBlockGroupData } = get();
      return fetchData("blockGroupData", setBlockGroupData);
    },
    fetchCensusBlockGroups: () => {
      const { setCensusBlockGroups } = get();
      return fetchData("censusBlockGroups", setCensusBlockGroups);
    },
    fetchHawaiianHomelands: () => {
      const { setHawaiianHomelands } = get();
      return fetchData("hawaiianHomelands", setHawaiianHomelands);
    },
    fetchCountyBoundaries: () => {
      const { setCountyBoundaries } = get();
      return fetchData("countyBoundaries", setCountyBoundaries);
    },

    fetchHazardLayers: async () => {
      const { setLoading, setError, setHazardLayers } = get();
      const { fetchHazardLayerConfigs, hazardLayerConfigs } = useHazardLayersStore.getState();

      setLoading("hazardLayers", true);
      setError("hazardLayers", null);

      try {
        await fetchHazardLayerConfigs();
        const { hazardLayerConfigs: updated } = useHazardLayersStore.getState();
        setHazardLayers(updated);
      } catch (err) {
        console.error("Failed to fetch hazard layers:", err);
        setError("hazardLayers", "Failed to fetch hazard layers");
      } finally {
        setLoading("hazardLayers", false);
      }
    },

    fetchAllData: async () => {
      const {
        fetchGeographiesData,
        fetchBlockGroupData,
        fetchCensusBlockGroups,
        fetchHawaiianHomelands,
        fetchCountyBoundaries,
        fetchHazardLayers,
      } = get();

      await Promise.all([
        fetchGeographiesData(),
        fetchBlockGroupData(),
        fetchCensusBlockGroups(),
        fetchHawaiianHomelands(),
        fetchCountyBoundaries(),
        fetchHazardLayers(),
      ]);
    },
  };
});

// Computed selector for isReady
export const useIsReady = () => {
  return useAppStore((state) => {
    const { loading, errors } = state;
    const hasErrors = Object.values(errors).some((e) => e !== null);
    const isLoading = Object.values(loading).some((l) => l);

    return (
      !isLoading &&
      !hasErrors &&
      state.geographiesData !== null &&
      state.blockGroupData !== null &&
      state.censusBlockGroups !== null &&
      state.hawaiianHomelands !== null &&
      state.countyBoundaries !== null &&
      state.hazardLayers.length > 0
    );
  });
};
