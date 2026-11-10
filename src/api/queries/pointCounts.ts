import { useMemo } from "react";
import { useQueries, type UseQueryResult } from "@tanstack/react-query";
import { POINT_LAYERS } from "../../config/pointLayers";
import { useMapLayersStore } from "../../stores/useMapLayersStore";
import type { MetricValue, PointLayerConfig } from "../../types";
import { layerDatasetId } from "../../utils/layerDatasets";
import { useDatasets } from "./datasets";
import { metricValuesQuery } from "./metricValues";

export interface VisiblePointCounts {
  layers: PointLayerConfig[]; // currently visible on the map
  getCount: (layerId: string, geoid: string) => number | null;
  // Whether any count is still on its way
  loading: boolean;
  // Whether a layer's counts couldn't be fetched
  failed: (layerId: string) => boolean;
}

// The answers in order, whether any is still loading, and which failed; the same object until one changes
const countsOf = (results: UseQueryResult<Record<string, MetricValue>>[]) => ({
  data: results.map((result) => result.data),
  loading: results.some((result) => result.isPending && result.fetchStatus !== "idle"),
  failed: results.map((result) => result.isError),
});

// Point counts for every geoid, across whichever layers are currently toggled on map; blank where a layer has none saved
export function useVisiblePointCounts(isHomelands: boolean, mapId: string): VisiblePointCounts {
  const catalog = useDatasets();
  const visibleIds = useMapLayersStore((state) => state.points[mapId]);

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
    combine: countsOf,
  });

  return useMemo(() => {
    const byLayer = new Map(layers.map((layer, i) => [layer.id, counts.data[i]]));
    const failedIds = new Set(layers.filter((_, i) => counts.failed[i]).map((layer) => layer.id));
    return {
      layers,
      getCount: (layerId, geoid) => byLayer.get(layerId)?.[geoid]?.absolute ?? null,
      loading: counts.loading,
      failed: (layerId) => failedIds.has(layerId),
    };
  }, [layers, counts]);
}
