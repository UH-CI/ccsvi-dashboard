import { useEffect, useMemo, useState } from "react";
import { usePointLayerStore } from "../stores/usePointLayersStore";
import { POINT_LAYERS } from "../config/pointLayers";
import { getPointsByGeoid } from "../api/client";
import type { PointLayerConfig } from "../types";

// Shared across every table, so switching tabs/rows never re-fetches a layer already fetched
const namesCache: Record<string, Promise<Record<string, string[]>>> = {};

function fetchNamesOnce(layerId: string, isHomelands: boolean): Promise<Record<string, string[]>> {
  const cacheKey = `${layerId}::${isHomelands ? "homelands" : "block_groups"}`;
  if (!namesCache[cacheKey]) {
    namesCache[cacheKey] = getPointsByGeoid(layerId, isHomelands);
  }
  return namesCache[cacheKey];
}

export interface TablePointNames {
  layers: PointLayerConfig[]; // currently visible on the map
  getNames: (layerId: string, geoid: string) => string[];
}

// Point names for every geoid, across whichever layers are currently toggled on map
export function usePointNamesForTable(isHomelands: boolean, mapId: string): TablePointNames {
  const visibleIds = usePointLayerStore((state) => state.visibleLayerIdsByMap[mapId]);
  const layers = useMemo(
    () => POINT_LAYERS.filter((layer) => visibleIds?.has(layer.id)),
    [visibleIds],
  );

  const [namesByLayer, setNamesByLayer] = useState<Record<string, Record<string, string[]>>>({});

  useEffect(() => {
    let cancelled = false;
    for (const layer of layers) {
      fetchNamesOnce(layer.id, isHomelands).then((data) => {
        if (!cancelled) setNamesByLayer((prev) => ({ ...prev, [layer.id]: data }));
      });
    }
    return () => {
      cancelled = true;
    };
  }, [layers, isHomelands]);

  return useMemo(() => {
    const getNames = (layerId: string, geoid: string): string[] => namesByLayer[layerId]?.[geoid] ?? [];
    return { layers, getNames };
  }, [layers, namesByLayer]);
}