import { useMemo } from "react";
import { useActiveRaster } from "../../stores/useRasterLayersStore";
import { layerDatasetId } from "../../utils/layerDatasets";
import { queryClient } from "../queryClient";
import { datasetsQuery, useDatasets } from "./datasets";
import { fetchMetricValues, useMetricValues } from "./metricValues";

// A raster's saved mean and max for one area; null where it has none
export async function savedRasterStats(
  rasterId: string,
  geoid: string,
  homelands: boolean,
): Promise<{ mean: number | null; max: number | null }> {
  const dataset = layerDatasetId(await queryClient.fetchQuery(datasetsQuery), rasterId, homelands);
  if (!dataset) return { mean: null, max: null };
  const [mean, max] = await Promise.all([
    fetchMetricValues(dataset, "Mean"),
    fetchMetricValues(dataset, "Max"),
  ]);
  return {
    mean: mean[geoid]?.absolute ?? null,
    max: max[geoid]?.absolute ?? null,
  };
}

// The visible raster's saved means and maxes for the table: its name and lookups of one area's values
export function useSavedRasterForTable(isHomelands: boolean, mapId: string) {
  const datasets = useDatasets();
  const active = useActiveRaster(mapId);
  const dataset = active ? layerDatasetId(datasets, active.id, isHomelands) : null;
  const means = useMetricValues(dataset, "Mean");
  const maxes = useMetricValues(dataset, "Max");

  return useMemo(() => {
    if (!active?.config) return null;
    return {
      name: active.config.name,
      units: active.config.units,
      getMean: (geoid: string): number | null => means?.[geoid]?.absolute ?? null,
      getMax: (geoid: string): number | null => maxes?.[geoid]?.absolute ?? null,
    };
  }, [active, means, maxes]);
}
