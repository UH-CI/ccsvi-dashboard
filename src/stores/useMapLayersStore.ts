import { useMemo } from "react";
import { create } from "zustand";
import { HAZARD_LAYERS } from "../config/hazardLayers";
import { HCDP_OPACITY, rasterColormap, rasterConfig, splitRasterId } from "../config/rasterLayers";
import type { VisibleIds } from "../utils/layerMenus";
import type { RasterSource } from "../types";

// One map's raster: a saved one by id, or HCDP with the title shown in its legend and popup
export type MapRaster =
  | { kind: "cog"; id: string }
  | { kind: "hcdp"; params: Record<string, string>; title: string };

interface MapLayersState {
  // Point layer ids on, per map
  points: Record<string, ReadonlySet<string>>;
  // Hazard ids on, per map: a layer's id, and "<id>.<subId>" for each of its sub-layers that's on
  hazards: Record<string, ReadonlySet<string>>;
  // The one raster on each map
  rasters: Record<string, MapRaster | undefined>;
  // The colour bar the user picked, per map, per raster id
  colormapOverrides: Record<string, Record<string, string>>;
  setVisible: (kind: "points" | "hazards", mapId: string, ids: Iterable<string>) => void;
  togglePoint: (mapId: string, id: string) => void;
  // A layer with sub-layers turns them all on or off with it
  toggleHazard: (mapId: string, id: string) => void;
  // The layer's own id stays on while any of its sub-layers is
  toggleHazardSub: (mapId: string, parentId: string, subId: string) => void;
  setRaster: (mapId: string, raster: MapRaster | null) => void;
  // Shows this saved raster, replacing what was on, or removes it if it's the one showing
  toggleRaster: (mapId: string, id: string) => void;
  setRasterColormap: (mapId: string, rasterId: string, name: string) => void;
  // Forgets everything kept for a map, so a later map with the same id starts clean
  clearMap: (mapId: string) => void;
}

const NO_IDS: ReadonlySet<string> = new Set();

function without<T>(record: Record<string, T>, key: string): Record<string, T> {
  return Object.fromEntries(Object.entries(record).filter(([k]) => k !== key));
}

export const useMapLayersStore = create<MapLayersState>((set, get) => ({
  points: {},
  hazards: {},
  rasters: {},
  colormapOverrides: {},

  setVisible: (kind, mapId, ids) =>
    set((state) => ({ [kind]: { ...state[kind], [mapId]: new Set(ids) } })),

  togglePoint: (mapId, id) => {
    const ids = new Set(get().points[mapId]);
    if (!ids.delete(id)) ids.add(id);
    get().setVisible("points", mapId, ids);
  },

  toggleHazard: (mapId, id) => {
    const ids = new Set(get().hazards[mapId]);
    const layer = HAZARD_LAYERS.find((l) => l.id === id)!;
    const subIds = (layer.subLayers ?? []).map((sub) => `${id}.${sub.id}`);
    if (ids.has(id)) [id, ...subIds].forEach((each) => ids.delete(each));
    else [id, ...subIds].forEach((each) => ids.add(each));
    get().setVisible("hazards", mapId, ids);
  },

  toggleHazardSub: (mapId, parentId, subId) => {
    const ids = new Set(get().hazards[mapId]);
    const layer = HAZARD_LAYERS.find((l) => l.id === parentId)!;
    if (ids.delete(`${parentId}.${subId}`)) {
      if (!layer.subLayers!.some((sub) => ids.has(`${parentId}.${sub.id}`))) ids.delete(parentId);
    } else {
      ids.add(`${parentId}.${subId}`);
      ids.add(parentId);
    }
    get().setVisible("hazards", mapId, ids);
  },

  setRaster: (mapId, raster) =>
    set((state) => ({ rasters: { ...state.rasters, [mapId]: raster ?? undefined } })),

  toggleRaster: (mapId, id) => {
    const current = get().rasters[mapId];
    const showing = current?.kind === "cog" && current.id === id;
    get().setRaster(mapId, showing ? null : { kind: "cog", id });
  },

  setRasterColormap: (mapId, rasterId, name) =>
    set((state) => ({
      colormapOverrides: {
        ...state.colormapOverrides,
        [mapId]: { ...state.colormapOverrides[mapId], [rasterId]: name },
      },
    })),

  clearMap: (mapId) =>
    set((state) => ({
      points: without(state.points, mapId),
      hazards: without(state.hazards, mapId),
      rasters: without(state.rasters, mapId),
      colormapOverrides: without(state.colormapOverrides, mapId),
    })),
}));

// The raster's ids as the menus and the link see them: a sub-layer's layer id and its own, or just
// the layer's id; none for HCDP
export function visibleRasterIds(raster: MapRaster | undefined): ReadonlySet<string> {
  if (raster?.kind !== "cog") return NO_IDS;
  const [layerId, subId] = splitRasterId(raster.id);
  return new Set(subId ? [layerId, raster.id] : [layerId]);
}

// The ids on one map, per kind of layer; the same object until one of them changes
export function useVisibleIds(mapId: string): VisibleIds {
  const points = useMapLayersStore((state) => state.points[mapId]);
  const hazards = useMapLayersStore((state) => state.hazards[mapId]);
  const raster = useMapLayersStore((state) => state.rasters[mapId]);
  return useMemo(
    () => ({ point: points ?? NO_IDS, shape: hazards ?? NO_IDS, raster: visibleRasterIds(raster) }),
    [points, hazards, raster],
  );
}

// The map's raster with what drawing it and its legend need
export interface ShownRaster {
  raster: MapRaster;
  // What the tile server is asked for, without the title, so it matches the HCDP form's request
  source: RasterSource;
  name: string;
  units?: string;
  colormap: string;
  opacity: number;
}

// One map's raster, saved or HCDP; the same object until it or its colour bar changes
export function useMapRaster(mapId: string): ShownRaster | null {
  const raster = useMapLayersStore((state) => state.rasters[mapId]);
  const overrides = useMapLayersStore((state) => state.colormapOverrides[mapId]);
  return useMemo(() => {
    if (!raster) return null;
    if (raster.kind === "hcdp") {
      return {
        raster,
        source: { kind: "hcdp", params: raster.params },
        name: raster.title,
        colormap: "hcdp",
        opacity: HCDP_OPACITY,
      };
    }
    const config = rasterConfig(raster.id);
    return {
      raster,
      source: raster,
      name: config.name,
      units: config.units,
      colormap: rasterColormap(raster.id, overrides),
      opacity: config.opacity,
    };
  }, [raster, overrides]);
}
