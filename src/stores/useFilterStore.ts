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

// One Data Analyzer slider's chosen [min, max]; null is the indicator's whole range
export type SliderRange = [number, number] | null;

interface FilterState {
  // Nothing while no filter is applied
  applied: AppliedFilter | null;
  // The sliders for the main map's indicator and its comparison indicator
  ranges: { primary: SliderRange; comparison: SliderRange };
  apply: (filter: AppliedFilter) => void;
  setRange: (slider: "primary" | "comparison", range: SliderRange) => void;
  // Empties the applied filter and both sliders
  clear: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  applied: null,
  ranges: { primary: null, comparison: null },
  apply: (filter) => set({ applied: filter }),
  setRange: (slider, range) => set((state) => ({ ranges: { ...state.ranges, [slider]: range } })),
  clear: () => set({ applied: null, ranges: { primary: null, comparison: null } }),
}));
