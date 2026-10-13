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

// A raster's saved average for one area.
export async function savedRasterAverage(
  saved: { dataset: string; metric: string },
  geoid: string,
  homelands: boolean,
): Promise<number | null> {
  const dataset = homelands ? `${saved.dataset}_homelands` : saved.dataset;
  await useAppStore.getState().fetchMetricValues(dataset, saved.metric);
  const values = useAppStore.getState().metricValuesCache[`${dataset}::${saved.metric}`];
  return values?.[geoid]?.absolute ?? null;
}

// The visible raster's saved averages for the table: its name and a lookup of one area's value
export function useSavedRasterForTable(isHomelands: boolean, mapId: string) {
  const visibleIds = useRasterLayersStore((s) => s.visibleLayerIdsByMap[mapId]);
  const configs = useRasterLayersStore((s) => s.rasterLayerConfigs);
  const metricValuesCache = useAppStore((s) => s.metricValuesCache);
  const fetchMetricValues = useAppStore((s) => s.fetchMetricValues);

  const config = useMemo(() => getActiveRaster(visibleIds, configs)?.config ?? null, [visibleIds, configs]);
  const saved = config?.savedMetric ?? null;
  const dataset = saved ? (isHomelands ? `${saved.dataset}_homelands` : saved.dataset) : null;

  useEffect(() => {
    if (saved && dataset) fetchMetricValues(dataset, saved.metric);
  }, [saved, dataset, fetchMetricValues]);

  return useMemo(() => {
    if (!config || !saved || !dataset) return null;
    const values = metricValuesCache[`${dataset}::${saved.metric}`];
    const getValue = (geoid: string): number | null => values?.[geoid]?.absolute ?? null;
    return { name: config.name, units: config.units, getValue };
  }, [config, saved, dataset, metricValuesCache]);
}
