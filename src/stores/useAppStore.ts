import { create } from 'zustand';
import { DATASETS_CONFIG, DataSourceKey, DataSourceTypeMap } from '../config';
import { MetricsData, Dataset, PointLayerConfig } from '../types';
import { FeatureCollection, Geometry } from 'geojson';
import { BlockGroupProperties, HawaiianHomelandProperties, CountyBoundariesProperties } from '../types';

// Hardcoding here instead of importing from config to maintain transparency of the store file
interface LoadingState {
  metricsData: boolean;
  blockGroupData: boolean;
  censusBlockGroups: boolean;
  hawaiianHomelands: boolean;
  countyBoundaries: boolean;
  pointLayers: boolean;
}

interface ErrorState {
  [key: string]: string | null;
}

interface AppState {
  // Data state
  metricsData: MetricsData | null;
  blockGroupData: Dataset | null;
  censusBlockGroups: FeatureCollection<Geometry, BlockGroupProperties> | null;
  hawaiianHomelands: FeatureCollection<Geometry, HawaiianHomelandProperties> | null;
  countyBoundaries: FeatureCollection<Geometry, CountyBoundariesProperties> | null;
  pointLayers: PointLayerConfig[];

  loading: LoadingState;
  errors: ErrorState;
  isReady: boolean;

  // Actions
  setMetricsData: (data: MetricsData) => void;
  setBlockGroupData: (data: Dataset) => void;
  setCensusBlockGroups: (data: FeatureCollection<Geometry, BlockGroupProperties>) => void;
  setHawaiianHomelands: (data: FeatureCollection<Geometry, HawaiianHomelandProperties>) => void;
  setCountyBoundaries: (data: FeatureCollection<Geometry, CountyBoundariesProperties>) => void;
  setPointLayers: (data: PointLayerConfig[]) => void;

  setLoading: (key: keyof LoadingState, loading: boolean) => void;
  setError: (key: string, error: string | null) => void;

  // Data fetching actions
  fetchMetricsData: () => Promise<void>;
  fetchBlockGroupData: () => Promise<void>;
  fetchCensusBlockGroups: () => Promise<void>;
  fetchHawaiianHomelands: () => Promise<void>;
  fetchCountyBoundaries: () => Promise<void>;
  fetchAllData: () => Promise<void>;
}

const initialLoadingState: LoadingState = {
  metricsData: false,
  blockGroupData: false,
  censusBlockGroups: false,
  hawaiianHomelands: false,
  countyBoundaries: false,
  pointLayers: false,
};

const initialErrorState: ErrorState = {};

export const useAppStore = create<AppState>((set, get) => {
    const fetchData = async <K extends DataSourceKey>(
        key: K,
        setter: (data: DataSourceTypeMap[K]) => void
    ): Promise<void> => {
        const config = DATASETS_CONFIG[key];
        const { setLoading, setError } = get();

        setLoading(key as keyof LoadingState, true);
        setError(key, null);

        try {
            const response = await fetch(config.path);
            if (!response.ok) {
                throw new Error(`${config.errorPrefix}: ${response.status} ${response.statusText}`);
            }
            const data = await response.json() as DataSourceTypeMap[K];
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
        metricsData: null,
        blockGroupData: null,
        censusBlockGroups: null,
        hawaiianHomelands: null,
        countyBoundaries: null,
        pointLayers: [],
        loading: initialLoadingState,
        errors: initialErrorState,
        isReady: false,

        // Setters
        setMetricsData: (data) => set({metricsData: data}),
        setBlockGroupData: (data) => set({blockGroupData: data}),
        setCensusBlockGroups: (data) => set({censusBlockGroups: data}),
        setHawaiianHomelands: (data) => set({hawaiianHomelands: data}),
        setCountyBoundaries: (data) => set({countyBoundaries: data}),
        setPointLayers: (data) => set({pointLayers: data}),

        setLoading: (key, loading) =>
            set((state) => ({
                loading: {...state.loading, [key]: loading}
            })),

        setError: (key, error) =>
            set((state) => ({
                errors: {...state.errors, [key]: error}
            })),

        // Data fetching actions
        fetchMetricsData: () => {
            const { setMetricsData } = get();
            return fetchData('metricsData', setMetricsData);
        },

        fetchBlockGroupData: () => {
            const { setBlockGroupData } = get();
            return fetchData('blockGroupData', setBlockGroupData);
        },

        fetchCensusBlockGroups: () => {
            const { setCensusBlockGroups } = get();
            return fetchData('censusBlockGroups', setCensusBlockGroups);
        },

        fetchHawaiianHomelands: () => {
            const { setHawaiianHomelands } = get();
            return fetchData('hawaiianHomelands', setHawaiianHomelands);
        },

        fetchCountyBoundaries: () => {
            const { setCountyBoundaries } = get();
            return fetchData('countyBoundaries', setCountyBoundaries);
        },

        fetchAllData: async () => {
            const {
                fetchMetricsData,
                fetchBlockGroupData,
                fetchCensusBlockGroups,
                fetchHawaiianHomelands,
                fetchCountyBoundaries
            } = get();

            // Fetch all data in parallel
            await Promise.all([
                fetchMetricsData(),
                fetchBlockGroupData(),
                fetchCensusBlockGroups(),
                fetchHawaiianHomelands(),
                fetchCountyBoundaries(),
            ]);
        },
    };
});

// Computed selector for isReady
export const useIsReady = () => {
  return useAppStore((state) => {
    const { loading, errors } = state;
    const hasErrors = Object.values(errors).some(error => error !== null);
    const isLoading = Object.values(loading).some(loading => loading);
    
    return !isLoading && !hasErrors && 
           state.metricsData !== null && 
           state.blockGroupData !== null && 
           state.censusBlockGroups !== null && 
           state.hawaiianHomelands !== null && 
           state.countyBoundaries !== null;
  });
};
