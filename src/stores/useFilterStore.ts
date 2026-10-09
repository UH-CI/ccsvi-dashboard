import { create } from "zustand";
import { BlockGroupResult } from "../types";
import { POINT_LAYERS } from "../config/pointLayers";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

interface FilterState {
  county: string | null;
  hazards: string[];
  metricFilters: Partial<Record<string, number>>;
  pointLayerFilters: Set<string>;
  pointGroupModes: Record<string, "all" | "any">;
  // Filters for "ANY/OR" conditions
  anyFilters: string[];
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
  layers: Set<string> | null;
}

interface FilterActions {
  setCounty: (county: string | null) => void;
  setHomelands: (homelands: boolean) => void;
  setHazards: (ids: string[]) => void;
  setMetricFilter: (col: string, value: number | null) => void;
  togglePointLayerFilter: (id: string) => void;
  setPointGroupMode: (groupId: string, mode: "all" | "any") => void;
  setAnyFilters: (entries: string[]) => void;
  applyFilter: () => Promise<void>;
  applyPointHazardFilter: (hazards: string[], layers: Set<string>) => void;
  buildExportUrl: () => string;
  clearFilter: () => void;
}

const initialState: FilterState = {
  county: null,
  hazards: [],
  metricFilters: {},
  pointLayerFilters: new Set(POINT_LAYERS.map((layer) => layer.id)),
  pointGroupModes: {},
  anyFilters: [],
  homelands: false,
  results: null,
  filteredGeoids: null,
  pointFilter: null,
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
  for (const entry of state.anyFilters) params.append("any", entry);
  return params;
};

const filterUrl = (state: FilterState, params: URLSearchParams): string =>
  `${BASE_URL}/api/v1/${state.homelands ? "hawaiian-homelands" : "block-groups"}?${params}`;

export const useFilterStore = create<FilterState & FilterActions>((set, get) => ({
  ...initialState,

  setCounty: (county) => set({ county }),
  setHomelands: (homelands) => set({ homelands }),
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

  togglePointLayerFilter: (id) =>
    set((state) => {
      const next = new Set(state.pointLayerFilters);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { pointLayerFilters: next };
    }),

  setPointGroupMode: (groupId, mode) =>
    set((state) => ({ pointGroupModes: { ...state.pointGroupModes, [groupId]: mode } })),

  setAnyFilters: (entries) => set({ anyFilters: entries }),

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
        pointFilter: { geoids: filteredGeoids, hazards: get().hazards, layers: null },
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Filter failed",
        isLoading: false,
      });
    }
  },

  // Used when no SVI is on the map. Skips neighborhoods entirely and checks points against hazards only.
  applyPointHazardFilter: (hazards, layers) =>
    set({
      hazards,
      results: null,
      filteredGeoids: null,
      pointFilter: { geoids: null, hazards, layers },
      error: null,
    }),

  buildExportUrl: () => {
    const params = buildParams(get());
    params.set("format", "csv");
    return filterUrl(get(), params);
  },

  clearFilter: () => set({ ...initialState }),
}));

export const useIsFiltered = () => useFilterStore((s) => s.results !== null);

export const useFilteredGeoids = () => useFilterStore((s) => s.filteredGeoids);
