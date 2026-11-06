import { create } from "zustand";

interface AppState {
  // Primary metric's threshold slider (Data Analyzer)
  filterRange: [number, number] | null;
  setFilterRange: (range: [number, number] | null) => void;
  // Comparison metric's threshold slider (Data Analyzer)
  filterRange2: [number, number] | null;
  setFilterRange2: (range: [number, number] | null) => void;
  // The table's CSV export while the table is showing, so the Data Analyzer's download saves the same file
  exportTable: (() => void) | null;
  setExportTable: (exportTable: (() => void) | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  filterRange: null,
  setFilterRange: (range) => set({ filterRange: range }),
  filterRange2: null,
  setFilterRange2: (range) => set({ filterRange2: range }),
  exportTable: null,
  setExportTable: (exportTable) => set({ exportTable }),
}));
