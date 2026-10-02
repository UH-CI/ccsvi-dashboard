import { useEffect, useMemo } from "react";
import { useAppStore } from "../stores";
import { POINT_LAYERS } from "../config/pointLayers";

export interface PointCounts {
  loading: boolean;
  counts: Record<string, number | null>;
}

const datasetIdFor = (layerId: string, isHomelands: boolean): string =>
  isHomelands ? `${layerId}_points_homelands` : `${layerId}_points`;

// Per-layer point counts for one block group / Hawaiian Homeland area
export function usePointCounts(geoid: string | null, isHomelands: boolean): PointCounts {
  const metricValuesCache = useAppStore((state) => state.metricValuesCache);
  const fetchMetricValues = useAppStore((state) => state.fetchMetricValues);

  useEffect(() => {
    for (const layer of POINT_LAYERS) {
      fetchMetricValues(datasetIdFor(layer.id, isHomelands), "Count");
    }
  }, [isHomelands, fetchMetricValues]);

  return useMemo(() => {
    if (!geoid) return { loading: false, counts: {} };

    let loading = false;
    const counts: Record<string, number | null> = {};
    for (const layer of POINT_LAYERS) {
      const cacheKey = `${datasetIdFor(layer.id, isHomelands)}::Count`;
      const cached = metricValuesCache[cacheKey];
      if (cached === undefined) {
        loading = true;
        counts[layer.id] = null;
        continue;
      }
      counts[layer.id] = cached[geoid]?.absolute ?? null;
    }
    return { loading, counts };
  }, [geoid, isHomelands, metricValuesCache]);
}

// Same lookup as usePointCounts hook, for use outside of react components (like the popup)
export async function fetchPointCounts(
  geoid: string,
  isHomelands: boolean,
): Promise<Record<string, number | null>> {
  const { fetchMetricValues } = useAppStore.getState();
  await Promise.all(
    POINT_LAYERS.map((layer) => fetchMetricValues(datasetIdFor(layer.id, isHomelands), "Count")),
  );

  const cache = useAppStore.getState().metricValuesCache;
  const counts: Record<string, number | null> = {};
  for (const layer of POINT_LAYERS) {
    const cacheKey = `${datasetIdFor(layer.id, isHomelands)}::Count`;
    counts[layer.id] = cache[cacheKey]?.[geoid]?.absolute ?? null;
  }
  return counts;
}