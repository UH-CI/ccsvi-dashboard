import { useEffect, useMemo } from "react";
import { useAppStore } from "../stores/useAppStore.ts";
import { useRasterLayersStore } from "../stores/useRasterLayersStore.ts";
import type { RasterLayerConfig, SubRasterLayerConfig } from "../types";

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

// A raster's saved mean and max for one area.
export async function savedRasterStats(
  saved: { dataset: string; mean: string; max: string },
  geoid: string,
  homelands: boolean,
): Promise<{ mean: number | null; max: number | null }> {
  const dataset = homelands ? `${saved.dataset}_homelands` : saved.dataset;
  await Promise.all([
    useAppStore.getState().fetchMetricValues(dataset, saved.mean),
    useAppStore.getState().fetchMetricValues(dataset, saved.max),
  ]);
  const cache = useAppStore.getState().metricValuesCache;
  return {
    mean: cache[`${dataset}::${saved.mean}`]?.[geoid]?.absolute ?? null,
    max: cache[`${dataset}::${saved.max}`]?.[geoid]?.absolute ?? null,
  };
}

// The visible raster's saved means and maxes for the table: its name and lookups of one area's values
export function useSavedRasterForTable(isHomelands: boolean, mapId: string) {
  const visibleIds = useRasterLayersStore((s) => s.visibleLayerIdsByMap[mapId]);
  const configs = useRasterLayersStore((s) => s.rasterLayerConfigs);
  const metricValuesCache = useAppStore((s) => s.metricValuesCache);
  const fetchMetricValues = useAppStore((s) => s.fetchMetricValues);

  const config = useMemo(() => getActiveRaster(visibleIds, configs)?.config ?? null, [visibleIds, configs]);
  const saved = config?.savedMetrics ?? null;
  const dataset = saved ? (isHomelands ? `${saved.dataset}_homelands` : saved.dataset) : null;

  useEffect(() => {
    if (!saved || !dataset) return;
    fetchMetricValues(dataset, saved.mean);
    fetchMetricValues(dataset, saved.max);
  }, [saved, dataset, fetchMetricValues]);

  return useMemo(() => {
    if (!config || !saved || !dataset) return null;
    const lookup = (metric: string) => (geoid: string): number | null =>
      metricValuesCache[`${dataset}::${metric}`]?.[geoid]?.absolute ?? null;
    return {
      name: config.name,
      units: config.units,
      getMean: lookup(saved.mean),
      getMax: lookup(saved.max),
    };
  }, [config, saved, dataset, metricValuesCache]);
}
