import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useMapRaster } from "../../stores/useMapLayersStore";
import { layerDatasetId } from "../../utils/layerDatasets";
import { useDatasets } from "./datasets";
import { metricValuesQuery } from "./metricValues";

// The map's saved raster: its name and lookups of one area's saved mean and max, for the table and the
// popups; null when the map has no saved raster. A value that's missing or couldn't be fetched is null.
export function useSavedRaster(isHomelands: boolean, mapId: string) {
  const datasets = useDatasets();
  const shown = useMapRaster(mapId);
  const savedId = shown?.raster.kind === "cog" ? shown.raster.id : null;
  const dataset = savedId ? layerDatasetId(datasets, savedId, isHomelands) : null;
  const means = useQuery({
    ...metricValuesQuery(dataset ?? "", "Mean"),
    enabled: dataset !== null,
  });
  const maxes = useQuery({ ...metricValuesQuery(dataset ?? "", "Max"), enabled: dataset !== null });
  const loading = dataset !== null && (means.isPending || maxes.isPending);

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
