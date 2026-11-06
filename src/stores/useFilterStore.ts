import { create } from "zustand";
import { BlockGroupResult } from "../types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

interface FilterState {
  hazards: string[];
  rasters: string[];
  metricFilters: Partial<Record<string, number>>;
  homelands: boolean;
  results: BlockGroupResult[] | null;
  filteredGeoids: Set<string> | null;
  pointFilter: PointFilter | null;
  isLoading: boolean;
  error: string | null;
}

interface PointFilter {
  geoids: Set<string> | null;
  hazards: string[];
  rasters: string[];
  layers: Set<string> | null;
}

interface FilterActions {
  setHomelands: (homelands: boolean) => void;
  setHazards: (ids: string[]) => void;
  setRasters: (ids: string[]) => void;
  setMetricFilter: (col: string, value: number | null) => void;
  applyFilter: () => Promise<void>;
  applyPointHazardFilter: (hazards: string[], rasters: string[], layers: Set<string>) => void;
  clearFilter: () => void;
}

const initialState: FilterState = {
  hazards: [],
  rasters: [],
  metricFilters: {},
  homelands: false,
  results: null,
  filteredGeoids: null,
  pointFilter: null,
  isLoading: false,
  error: null,
};

const buildParams = (state: FilterState): URLSearchParams => {
  const params = new URLSearchParams();
  for (const id of state.hazards) params.append("hazard", id);
  for (const [col, val] of Object.entries(state.metricFilters)) {
    if (val !== undefined) params.set(`min_${col}`, String(val));
  }
  return params;
};

const filterUrl = (state: FilterState, params: URLSearchParams): string =>
  `${BASE_URL}/api/v1/${state.homelands ? "hawaiian-homelands" : "block-groups"}?${params}`;

export const useFilterStore = create<FilterState & FilterActions>((set, get) => ({
  ...initialState,

  setHomelands: (homelands) => set({ homelands }),
  setHazards: (ids) => set({ hazards: ids }),
  setRasters: (ids) => set({ rasters: ids }),

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
      const res = await fetch(filterUrl(get(), params));
      if (!res.ok) throw new Error(`API error ${res.status}`);
      const data = (await res.json()) as BlockGroupResult[];
      const filteredGeoids = new Set(data.map((r) => r.geoid));
      set({
        results: data,
        filteredGeoids,
        pointFilter: {
          geoids: filteredGeoids,
          hazards: get().hazards,
          rasters: get().rasters,
          layers: null,
        },
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Filter failed",
        isLoading: false,
      });
    }
  },

  // Used when no SVI is on the map. Skips neighborhoods entirely and checks points against hazards and rasters only.
  applyPointHazardFilter: (hazards, rasters, layers) =>
    set({
      hazards,
      rasters,
      results: null,
      filteredGeoids: null,
      pointFilter: { geoids: null, hazards, rasters, layers },
      error: null,
    }),

  clearFilter: () => set({ ...initialState }),
}));

export const useFilteredGeoids = () => useFilterStore((s) => s.filteredGeoids);
