import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { POINT_LAYERS } from "../../../config/pointLayers";
import { useMapLayersStore } from "../../../stores/useMapLayersStore";
import type { PointLayerConfig } from "../../../types";
import { pointNamesQuery } from "../../../api/queries/pointNames";
import { dataOf } from "../../../api/queryClient";

export interface TablePointNames {
  layers: PointLayerConfig[]; // currently visible on the map
  getNames: (layerId: string, geoid: string) => string[];
}

// Point names for every geoid, across whichever layers are currently toggled on map
export function usePointNamesForTable(isHomelands: boolean, mapId: string): TablePointNames {
  const visibleIds = useMapLayersStore((state) => state.points[mapId]);
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
