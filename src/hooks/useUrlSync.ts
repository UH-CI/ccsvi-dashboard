import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMapStore } from "../stores";
import { useMapLayersStore, visibleRasterIds } from "../stores/useMapLayersStore";
import { POINT_LAYERS } from "../config/pointLayers";
import { HAZARD_LAYERS } from "../config/hazardLayers";
import { RASTER_IDS } from "../config/rasterLayers";
import {
  LAYER_LIST_KEYS,
  type LayerListKey,
  isUrlKey,
  readUrl,
  writeUrl,
} from "../utils/urlSerializer";

// Each of the link's layer lists: the ids it may hold, and how one map's ids go into the store.
// A link can be edited by hand, so ids no layer has are dropped.
const LINK_LISTS: Record<
  LayerListKey,
  { knownIds: ReadonlySet<string>; restore: (mapId: string, ids: string[]) => void }
> = {
  layers: {
    knownIds: new Set(POINT_LAYERS.map((layer) => layer.id)),
    restore: (mapId, ids) => useMapLayersStore.getState().setVisible("points", mapId, ids),
  },
  hazards: {
    knownIds: new Set(
      HAZARD_LAYERS.flatMap((layer) => [
        layer.id,
        ...(layer.subLayers ?? []).map((sub) => `${layer.id}.${sub.id}`),
      ]),
    ),
    restore: (mapId, ids) => useMapLayersStore.getState().setVisible("hazards", mapId, ids),
  },
  // A sub-layer's layer id is left out: the store works it out. A map shows one raster: the first
  // sub-layer named, else the first raster.
  rasters: {
    knownIds: RASTER_IDS,
    restore: (mapId, ids) => {
      const id = ids.find((each) => each.includes(".")) ?? ids[0];
      if (id) useMapLayersStore.getState().setRaster(mapId, { kind: "cog", id });
    },
  },
};

// Reads the link into the stores on first load, then keeps the link in step with them
export function useUrlSync() {
  const [, setSearchParams] = useSearchParams();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const { mapConfigs, primaryMapId, layers } = readUrl(
      new URLSearchParams(window.location.search),
    );
    useMapStore.getState().loadMaps(mapConfigs, primaryMapId);
    for (const key of LAYER_LIST_KEYS) {
      const { knownIds, restore } = LINK_LISTS[key];
      for (const [mapId, ids] of Object.entries(layers[key])) {
        restore(
          mapId,
          ids.filter((id) => knownIds.has(id)),
        );
      }
    }
    setIsInitialized(true);
  }, []);

  const mapConfigs = useMapStore((state) => state.mapConfigs);
  const primaryMapId = useMapStore((state) => state.primaryMapId);
  const points = useMapLayersStore((state) => state.points);
  const hazards = useMapLayersStore((state) => state.hazards);
  const rasters = useMapLayersStore((state) => state.rasters);

  // The app's part of the address; it changes only when something saved in the link changes.
  // HCDP isn't saved in the link.
  const urlText = useMemo(() => {
    const rasterIds = Object.fromEntries(
      Object.entries(rasters).map(([mapId, raster]) => [mapId, visibleRasterIds(raster)]),
    );
    return writeUrl(mapConfigs, primaryMapId, {
      layers: points,
      hazards,
      rasters: rasterIds,
    }).toString();
  }, [mapConfigs, primaryMapId, points, hazards, rasters]);

  useEffect(() => {
    if (!isInitialized) return;
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const key of Array.from(prev.keys())) {
          if (isUrlKey(key)) next.delete(key);
        }
        for (const [key, value] of new URLSearchParams(urlText)) next.set(key, value);
        return next;
      },
      { replace: true },
    );
  }, [urlText, isInitialized, setSearchParams]);
}
