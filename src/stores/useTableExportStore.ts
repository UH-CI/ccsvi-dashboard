import { create } from "zustand";

interface TableExportState {
  // The table's CSV export while the table is showing, so the Data Analyzer's download saves the same file
  exportTable: (() => void) | null;
  setExportTable: (exportTable: (() => void) | null) => void;
}

export const useTableExportStore = create<TableExportState>((set) => ({
  exportTable: null,
  setExportTable: (exportTable) => set({ exportTable }),
}));
