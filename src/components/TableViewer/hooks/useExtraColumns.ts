import { useMemo } from "react";
import { useHazardOverlapsForTable } from "../../../api/queries/hazardAreas";
import { useVisiblePointCounts } from "../../../api/queries/pointCounts";
import { usePointNamesForTable } from "../../../api/queries/pointNames";
import { useSavedRaster } from "../../../api/queries/savedRaster";
import type { TableColumn } from "../../../types";

// A column the table adds beside the dataset's own, from what's on the map: its heading, type, and value for an area
export interface ExtraColumn {
  field: string;
  heading: string;
  type: TableColumn["type"];
  sortable?: boolean;
  value: (geoid: string) => string | number | null;
}

// One map's extra columns in table order: point counts, point names, hazard overlaps, then the saved raster's mean and max
export function useExtraColumns(isHomelands: boolean, mapId: string): ExtraColumn[] {
  const { layers: pointLayers, getCount } = useVisiblePointCounts(isHomelands, mapId);
  const { getNames } = usePointNamesForTable(isHomelands, mapId);
  const { hazards, touches } = useHazardOverlapsForTable(mapId);
  const savedRaster = useSavedRaster(isHomelands, mapId);

  return useMemo(() => {
    const counts = pointLayers.map(
      (layer): ExtraColumn => ({
        field: `pointcount_${layer.id}`,
        heading: layer.name,
        type: "number",
        value: (geoid) => getCount(layer.id, geoid),
      }),
    );
    const names = pointLayers.map(
      (layer): ExtraColumn => ({
        field: `pointnames_${layer.id}`,
        heading: `${layer.name} (names)`,
        type: "text",
        sortable: false,
        value: (geoid) => getNames(layer.id, geoid).join(", ") || null,
      }),
    );
    const overlaps = hazards.map(
      (hazard): ExtraColumn => ({
        field: `hazard_${hazard.key}`,
        heading: `${hazard.label} (overlaps)`,
        type: "text",
        value: (geoid) => (touches(hazard.key, geoid) ? "Yes" : "No"),
      }),
    );
    const units = savedRaster?.units ? `, ${savedRaster.units}` : "";
    const raster: ExtraColumn[] = savedRaster
      ? [
          { stat: "mean", get: savedRaster.getMean },
          { stat: "max", get: savedRaster.getMax },
        ].map(({ stat, get }) => ({
          field: `raster_${stat}`,
          heading: `${savedRaster.name} (${stat}${units})`,
          type: "number",
          value: get,
        }))
      : [];
    return [...counts, ...names, ...overlaps, ...raster];
  }, [pointLayers, getCount, getNames, hazards, touches, savedRaster]);
}
