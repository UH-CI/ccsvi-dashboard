import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  useMapStore,
  usePointLayerStore,
  useHazardLayersStore,
  useRasterLayersStore,
} from "../stores";
import {
  LAYER_LIST_KEYS,
  type LayerListKey,
  isUrlKey,
  readUrl,
  writeUrl,
} from "../utils/urlSerializer";

// The store behind each of the link's layer lists
const LAYER_STORES: Record<
  LayerListKey,
  { getState: () => { setVisibleLayerIds: (mapId: string, ids: string[]) => void } }
> = {
  layers: usePointLayerStore,
  hazards: useHazardLayersStore,
  rasters: useRasterLayersStore,
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
      for (const [mapId, ids] of Object.entries(layers[key])) {
        LAYER_STORES[key].getState().setVisibleLayerIds(mapId, ids);
      }
    }
    setIsInitialized(true);
  }, []);

  const mapConfigs = useMapStore((state) => state.mapConfigs);
  const primaryMapId = useMapStore((state) => state.primaryMapId);
  const points = usePointLayerStore((state) => state.visibleLayerIdsByMap);
  const hazards = useHazardLayersStore((state) => state.visibleLayerIdsByMap);
  const rasters = useRasterLayersStore((state) => state.visibleLayerIdsByMap);

  // The app's part of the address; it changes only when something saved in the link changes
  const urlText = useMemo(
    () => writeUrl(mapConfigs, primaryMapId, { layers: points, hazards, rasters }).toString(),
    [mapConfigs, primaryMapId, points, hazards, rasters],
  );

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
