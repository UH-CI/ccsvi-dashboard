import { create } from "zustand";
import { BlockGroupResult } from "../types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

interface FilterState {
  county: string | null;
  hazards: string[];
  metricFilters: Partial<Record<string, number>>;
  results: BlockGroupResult[] | null;
  filteredGeoids: Set<string> | null;
  isLoading: boolean;
  error: string | null;
}

interface FilterActions {
  setCounty: (county: string | null) => void;
  setHazards: (ids: string[]) => void;
  setMetricFilter: (col: string, value: number | null) => void;
  applyFilter: () => Promise<void>;
  buildExportUrl: () => string;
  clearFilter: () => void;
}

const initialState: FilterState = {
  county: null,
  hazards: [],
  metricFilters: {},
  results: null,
  filteredGeoids: null,
  isLoading: false,
  error: null,
};

const buildParams = (state: FilterState): URLSearchParams => {
  const params = new URLSearchParams();
  if (state.county && state.county !== "__all__") params.set("county", state.county);
  for (const id of state.hazards) params.append("hazard", id);
  for (const [col, val] of Object.entries(state.metricFilters)) {
    if (val !== undefined) params.set(`min_${col}`, String(val));
  }
  return params;
};

export const useFilterStore = create<FilterState & FilterActions>((set, get) => ({
  ...initialState,

  setCounty: (county) => set({ county }),
  setHazards: (ids) => set({ hazards: ids }),

  setMetricFilter: (col, value) =>
    set((state) => {
      const next = { ...state.metricFilters };
      if (value === null) {
        delete next[col];
      } else {
        next[col] = value;
      }
      return { metricFilters: next };
    }),

  applyFilter: async () => {
    set({ isLoading: true, error: null });
    const params = buildParams(get());

    try {
      const res = await fetch(`${BASE_URL}/api/v1/block-groups?${params}`);
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = (await res.json()) as BlockGroupResult[];
      set({ results: data, filteredGeoids: new Set(data.map((r) => r.geoid)), isLoading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Filter failed",
        isLoading: false,
      });
    }
  },

  buildExportUrl: () => {
    const params = buildParams(get());
    params.set("format", "csv");
    return `${BASE_URL}/api/v1/block-groups?${params}`;
  },

  clearFilter: () => set({ ...initialState }),
}));

export const useIsFiltered = () => useFilterStore((s) => s.results !== null);

export const useFilteredGeoids = () => useFilterStore((s) => s.filteredGeoids);