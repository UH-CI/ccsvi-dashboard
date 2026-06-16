import { create } from "zustand";
import type { HcdpRangeRow } from "../utils/hcdpRaster";
import { formatHcdpDataTypeLabel } from "../utils/hcdpRaster";

export interface HcdpRasterOverlay {
  arrayBuffer: ArrayBuffer;
  row: HcdpRangeRow;
  date: string;
  title: string;
  loadId: number;
}

interface HCDPState {
  overlaysByMap: Record<string, HcdpRasterOverlay | undefined>;
  setRasterOverlay: (mapId: string, overlay: HcdpRasterOverlay | null) => void;
  clearRasterOverlay: (mapId: string) => void;
}

export function buildHcdpOverlayTitle(row: HcdpRangeRow, date: string): string {
  const extras = [row.aggregation, row.production, row.timescale?.replace(/^timescale/i, "TS ")].filter(
    Boolean,
  );
  return [formatHcdpDataTypeLabel(row.data_type), ...extras, row.period, date].join(" · ");
}

export const useHCDPStore = create<HCDPState>((set) => ({
  overlaysByMap: {},

  setRasterOverlay: (mapId, overlay) =>
    set((state) => ({
      overlaysByMap: {
        ...state.overlaysByMap,
        [mapId]: overlay ?? undefined,
      },
    })),

  clearRasterOverlay: (mapId) =>
    set((state) => {
      const { [mapId]: _removed, ...rest } = state.overlaysByMap;
      return { overlaysByMap: rest };
    }),
}));

// Selector hooks for convenience and parity with other stores
export const useHcdpOverlay = (mapId: string) =>
  useHCDPStore((s) => s.overlaysByMap[mapId] ?? null);

export const useHasHcdpOverlay = (mapId: string) =>
  useHCDPStore((s) => s.overlaysByMap[mapId] != null);

export const useHcdpOverlayLoadId = (mapId: string) =>
  useHCDPStore((s) => s.overlaysByMap[mapId]?.loadId ?? null);
