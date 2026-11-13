import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useMapRaster } from "../stores/useMapLayersStore";
import { useDatasets } from "../api/queries/datasets";
import { layerMetricKey, useMetrics } from "../api/queries/metrics";
import { metricValuesQuery } from "../api/queries/metricValues";

// The map's saved raster: its name and lookups of one area's saved mean and max, for the table and the
// popups; null when the map has no saved raster. A value that's missing or couldn't be fetched is null.
export function useSavedRaster(isHomelands: boolean, mapId: string) {
  const metrics = useMetrics();
  const datasets = useDatasets();
  const shown = useMapRaster(mapId);
  const savedId = shown?.raster.kind === "cog" ? shown.raster.id : null;
  const meanKey = savedId ? layerMetricKey(metrics, datasets, savedId, isHomelands, "Mean") : null;
  const maxKey = savedId ? layerMetricKey(metrics, datasets, savedId, isHomelands, "Max") : null;
  const means = useQuery(metricValuesQuery(meanKey));
  const maxes = useQuery(metricValuesQuery(maxKey));
  const loading = meanKey !== null && (means.isPending || maxes.isPending);

  return useMemo(() => {
    if (!savedId) return null;
    return {
      name: shown!.name,
      units: shown!.units,
      getMean: (geoid: string): number | null => means.data?.[geoid]?.absolute ?? null,
      getMax: (geoid: string): number | null => maxes.data?.[geoid]?.absolute ?? null,
      loading,
    };
  }, [savedId, shown, means.data, maxes.data, loading]);
}
