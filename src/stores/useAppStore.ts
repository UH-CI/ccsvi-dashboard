import { create } from "zustand";
import { MetricValue } from "../types";
import { getMetricValues } from "../api/client";

interface AppState {
  // Data
  metricValuesCache: Record<string, Record<string, MetricValue>>;
  // Primary metric's threshold slider (Data Analyzer)
  filterRange: [number, number] | null;
  setFilterRange: (range: [number, number] | null) => void;
  // Comparison metric's threshold slider (Data Analyzer)
  filterRange2: [number, number] | null;
  setFilterRange2: (range: [number, number] | null) => void;
  // The table's CSV export while the table is showing, so the Data Analyzer's download saves the same file
  exportTable: (() => void) | null;
  setExportTable: (exportTable: (() => void) | null) => void;

  // Data fetching
  fetchMetricValues: (dataset: string, metric: string) => Promise<void>;
}

const fetchingMetrics = new Map<string, Promise<void>>();

export const useAppStore = create<AppState>((set, get) => {
  return {
    // Initial state
    metricValuesCache: {},
    filterRange: null,
    setFilterRange: (range) => set({ filterRange: range }),
    filterRange2: null,
    setFilterRange2: (range) => set({ filterRange2: range }),
    exportTable: null,
    setExportTable: (exportTable) => set({ exportTable }),

    // Data fetching
    fetchMetricValues: async (dataset: string, metric: string) => {
      const cacheKey = `${dataset}::${metric}`;
      if (get().metricValuesCache[cacheKey] !== undefined) return;
      const inFlight = fetchingMetrics.get(cacheKey);
      if (inFlight) return inFlight;
      const request = (async () => {
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
      })();
      fetchingMetrics.set(cacheKey, request);
      return request;
    },
  };
});
