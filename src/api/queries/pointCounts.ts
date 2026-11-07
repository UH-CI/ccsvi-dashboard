import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { POINT_LAYERS } from "../../config/pointLayers";
import { usePointLayerStore } from "../../stores/usePointLayersStore";
import type { PointLayerConfig } from "../../types";
import { layerDatasetId } from "../../utils/layerDatasets";
import { dataOf, queryClient } from "../queryClient";
import { datasetsQuery, useDatasets } from "./datasets";
import { fetchMetricValues, metricValuesQuery } from "./metricValues";

// Every point layer's count for one block group / Hawaiian Homeland area, for the popups.
// A layer whose counts can't be fetched counts as none.
export async function fetchPointCounts(
  geoid: string,
  isHomelands: boolean,
): Promise<Record<string, number | null>> {
  const catalog = await queryClient.fetchQuery(datasetsQuery);
  const results = await Promise.allSettled(
    POINT_LAYERS.map((layer) => {
      const dataset = layerDatasetId(catalog, layer.id, isHomelands);
      return dataset ? fetchMetricValues(dataset, "Count") : Promise.resolve(null);
    }),
  );
  const counts: Record<string, number | null> = {};
  POINT_LAYERS.forEach((layer, i) => {
    const result = results[i];
    counts[layer.id] =
      result.status === "fulfilled" ? (result.value?.[geoid]?.absolute ?? null) : null;
  });
  return counts;
}

export interface TablePointCounts {
  layers: PointLayerConfig[]; // currently visible on the map
  getCount: (layerId: string, geoid: string) => number | null;
}

// Point counts for every geoid, across whichever layers are currently toggled on map; blank where a layer has none saved
export function usePointCountsForTable(isHomelands: boolean, mapId: string): TablePointCounts {
  const catalog = useDatasets();
  const visibleIds = usePointLayerStore((state) => state.visibleLayerIdsByMap[mapId]);

  const layers = useMemo(
    () => POINT_LAYERS.filter((layer) => visibleIds?.has(layer.id)),
    [visibleIds],
  );
  const datasets = layers.map((layer) => layerDatasetId(catalog, layer.id, isHomelands));

  const counts = useQueries({
    queries: datasets.map((dataset) => ({
      ...metricValuesQuery(dataset ?? "", "Count"),
      enabled: dataset !== null,
    })),
    combine: dataOf,
  });

  return useMemo(() => {
    const byLayer = new Map(layers.map((layer, i) => [layer.id, counts[i]]));
    const getCount = (layerId: string, geoid: string): number | null =>
      byLayer.get(layerId)?.[geoid]?.absolute ?? null;
    return { layers, getCount };
  }, [layers, counts]);
}
