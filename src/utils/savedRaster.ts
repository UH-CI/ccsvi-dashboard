import { useEffect, useMemo } from "react";
import { queryClient } from "../api/queryClient.ts";
import { datasetsQuery, useDatasets } from "../api/queries/datasets.ts";
import { useAppStore } from "../stores/useAppStore.ts";
import { useRasterLayersStore } from "../stores/useRasterLayersStore.ts";
import type { RasterLayerConfig, SubRasterLayerConfig } from "../types";
import { layerDatasetId } from "./layerDatasets.ts";

// The raster a popup reports on: a visible sub-layer if there is one, else the first visible layer
export function getActiveRaster(
  visibleIds: Set<string> | undefined,
  configs: RasterLayerConfig[],
): { id: string; config: RasterLayerConfig | SubRasterLayerConfig | null } | null {
  const ids = Array.from(visibleIds ?? []);
  const id = ids.find((candidate) => candidate.includes(".")) ?? ids[0];
  if (!id) return null;

  const [parentId, subId] = id.split(".");
  const parent = configs.find((layer) => layer.id === parentId);
  if (!parent) return { id, config: null };
  const config = subId ? (parent.subLayers?.find((layer) => layer.id === subId) ?? parent) : parent;
  return { id, config };
}

// A raster's saved mean and max for one area; null where it has none
export async function savedRasterStats(
  rasterId: string,
  geoid: string,
  homelands: boolean,
): Promise<{ mean: number | null; max: number | null }> {
  const { fetchMetricValues } = useAppStore.getState();
  const dataset = layerDatasetId(await queryClient.fetchQuery(datasetsQuery), rasterId, homelands);
  if (!dataset) return { mean: null, max: null };
  await Promise.all([fetchMetricValues(dataset, "Mean"), fetchMetricValues(dataset, "Max")]);
  const cache = useAppStore.getState().metricValuesCache;
  return {
    mean: cache[`${dataset}::Mean`]?.[geoid]?.absolute ?? null,
    max: cache[`${dataset}::Max`]?.[geoid]?.absolute ?? null,
  };
}

// The visible raster's saved means and maxes for the table: its name and lookups of one area's values
export function useSavedRasterForTable(isHomelands: boolean, mapId: string) {
  const visibleIds = useRasterLayersStore((s) => s.visibleLayerIdsByMap[mapId]);
  const configs = useRasterLayersStore((s) => s.rasterLayerConfigs);
  const datasets = useDatasets();
  const metricValuesCache = useAppStore((s) => s.metricValuesCache);
  const fetchMetricValues = useAppStore((s) => s.fetchMetricValues);

  const active = useMemo(() => getActiveRaster(visibleIds, configs), [visibleIds, configs]);
  const dataset = active ? layerDatasetId(datasets, active.id, isHomelands) : null;

  useEffect(() => {
    if (!dataset) return;
    fetchMetricValues(dataset, "Mean");
    fetchMetricValues(dataset, "Max");
  }, [dataset, fetchMetricValues]);

  return useMemo(() => {
    if (!active?.config) return null;
    const lookup =
      (metric: string) =>
      (geoid: string): number | null =>
        dataset ? (metricValuesCache[`${dataset}::${metric}`]?.[geoid]?.absolute ?? null) : null;
    return {
      name: active.config.name,
      units: active.config.units,
      getMean: lookup("Mean"),
      getMax: lookup("Max"),
    };
  }, [active, dataset, metricValuesCache]);
}
