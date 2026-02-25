import { create } from "zustand";

type SnapshotFn = () => Promise<void>;

type SnapshotState = {
  handlers: Record<string, SnapshotFn>;
  register: (mapId: string, fn: SnapshotFn) => void;
  unregister: (mapId: string) => void;
  snapshotOne: (mapId: string) => Promise<void>;
  snapshotAll: (mapIds?: string[]) => Promise<void>;
};

export const useSnapshotStore = create<SnapshotState>((set, get) => ({
  handlers: {},

  register: (mapId, fn) =>
    set((s) => ({ handlers: { ...s.handlers, [mapId]: fn } })),

  unregister: (mapId) =>
    set((s) => {
      const { [mapId]: _removed, ...rest } = s.handlers;
      return { handlers: rest };
    }),

  snapshotOne: async (mapId) => {
    const fn = get().handlers[mapId];
    if (fn) await fn();
  },

  snapshotAll: async (mapIds) => {
    const { handlers } = get();
    const ids = mapIds ?? Object.keys(handlers);

    for (const id of ids) {
      const fn = handlers[id];
      if (fn) await fn();
    }
  },
}));
