import { create } from "zustand";

type DataType = "temperature";
type Period = "day";
type Extent = "statewide";
type DateValue = string | null;

interface HCDPState {
  datatype: DataType;
  period: Period;
  date: DateValue;
  extent: Extent;
  minDate: DateValue;
  maxDate: DateValue;
  setDate: (date: DateValue) => void;
  setDateRange: (min: DateValue, max: DateValue) => void;
  getRasterUrl: () => string | null;
}

export const useStore = create<HCDPState>((set, get) => ({
  datatype: "temperature",
  period: "day",
  date: null,
  extent: "statewide",

  minDate: null,
  maxDate: null,

  setDate: (date) => set({ date }),
  setDateRange: (min, max) => set({ minDate: min, maxDate: max }),

  getRasterUrl: () => {
    const { datatype, period, date, extent } = get();
    if (!date) return null;

    return `/api/raster?datatype=${datatype}&period=${period}&date=${date}&extent=${extent}`;
  }
}));