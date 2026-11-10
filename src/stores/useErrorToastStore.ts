import { create } from "zustand";

// The message shown at the bottom of the screen when something couldn't be loaded
interface ErrorToastState {
  // Kept after closing, so the text stays while the message slides away
  message: string;
  open: boolean;
  show: (message: string) => void;
  dismiss: () => void;
}

export const useErrorToastStore = create<ErrorToastState>((set) => ({
  message: "",
  open: false,
  show: (message) => set({ message, open: true }),
  dismiss: () => set({ open: false }),
}));
