import { useMemo } from "react";
import { queryOptions, useQueries } from "@tanstack/react-query";
import { POINT_LAYERS } from "../../config/pointLayers";
import { usePointLayerStore } from "../../stores/usePointLayersStore";
import type { PointLayerConfig } from "../../types";
import { getPointsByGeoid } from "../client";
import { dataOf } from "../queryClient";

// One point layer's point names, grouped by the area they're in, from /api/v1/points/by-geoid
export const pointNamesQuery = (layerId: string, homelands: boolean) =>
  queryOptions({
    queryKey: ["point-names", layerId, homelands],
    queryFn: () => getPointsByGeoid(layerId, homelands),
  });

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

  const names = useQueries({
    queries: layers.map((layer) => pointNamesQuery(layer.id, isHomelands)),
    combine: dataOf,
  });

  return useMemo(() => {
    const byLayer = new Map(layers.map((layer, i) => [layer.id, names[i]]));
    const getNames = (layerId: string, geoid: string): string[] =>
      byLayer.get(layerId)?.[geoid] ?? [];
    return { layers, getNames };
  }, [layers, names]);
}
