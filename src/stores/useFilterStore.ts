import { create } from "zustand";
import { BlockGroupResult } from "../types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

interface FilterState {
  county: string | null;
  hazardId: string | null;
  subId: string | null;
  heightFt: number | null;
  metricFilters: Partial<Record<string, number>>;
  results: BlockGroupResult[] | null;
  isLoading: boolean;
  error: string | null;
}

interface FilterActions {
  setCounty: (county: string | null) => void;
  setHazard: (hazardId: string | null, subId?: string | null, heightFt?: number | null) => void;
  setMetricFilter: (col: string, value: number | null) => void;
  applyFilter: () => Promise<void>;
  buildExportUrl: () => string;
  clearFilter: () => void;
}

const initialState: FilterState = {
  county: null,
  hazardId: null,
  subId: null,
  heightFt: null,
  metricFilters: {},
  results: null,
  isLoading: false,
  error: null,
};

const buildParams = (state: FilterState): URLSearchParams => {
  const params = new URLSearchParams();
  if (state.county && state.county !== "__all__") params.set("county", state.county);
  if (state.hazardId) params.set("hazard_id", state.hazardId);
  if (state.subId) params.set("sub_id", state.subId);
  if (state.heightFt !== null) params.set("height_ft", String(state.heightFt));
  for (const [col, val] of Object.entries(state.metricFilters)) {
    if (val !== undefined) params.set(`min_${col}`, String(val));
  }
  return params;
};

export const useFilterStore = create<FilterState & FilterActions>((set, get) => ({
  ...initialState,

  setCounty: (county) => set({ county }),
  setHazard: (hazardId, subId = null, heightFt = null) => set({ hazardId, subId, heightFt }),

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
      set({ results: data, isLoading: false });
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

export const useFilteredGeoids = () =>
  useFilterStore((s) =>
    s.results ? new Set(s.results.map((r) => r.geoid)) : null,
  );