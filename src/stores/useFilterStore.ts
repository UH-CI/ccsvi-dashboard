import { create } from "zustand";
import type { ValueRange } from "../types";

// What the last Filter press asked for.
// "areas": with an indicator on the map, the block groups or Homelands touching every hazard and within
// each column's range, and every shown point layer's points inside them that also sit in the hazards and rasters.
// "points": with no indicator, just the listed point layers' points that sit inside the hazards and rasters.
export type AppliedFilter =
  | {
      kind: "areas";
      homelands: boolean;
      hazards: string[];
      rasters: string[];
      ranges: Record<string, ValueRange>;
    }
  | { kind: "points"; hazards: string[]; rasters: string[]; pointLayers: string[] };

interface FilterState {
  // Nothing while no filter is applied
  applied: AppliedFilter | null;
  apply: (filter: AppliedFilter) => void;
  clearFilter: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  applied: null,
  apply: (filter) => set({ applied: filter }),
  clearFilter: () => set({ applied: null }),
}));
