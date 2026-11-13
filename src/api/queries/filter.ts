import { useMemo } from "react";
import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";
import { useFilterStore } from "../../stores/useFilterStore";
import type { AreaCriteria, AreaResult, ValueRange } from "../../types";
import { getFilterResults } from "../client";

// The areas touching every hazard and within each column's range
export const filterQuery = (
  homelands: boolean,
  hazards: string[],
  ranges: Record<string, ValueRange>,
) =>
  queryOptions({
    queryKey: ["filter", homelands, [...hazards].sort(), ranges],
    queryFn: () => getFilterResults(homelands, hazards, ranges),
    meta: { failureMessage: "The filter couldn't be applied. Please try again." },
  });

const geoidsOf = (results: AreaResult[]) => new Set(results.map((result) => result.geoid));

// The areas of the last Filter press. While a new filter loads, the previous one's areas stay on screen.
export function useAreaFilter() {
  const applied = useFilterStore((state) => state.applied);
  const areas = applied?.kind === "areas" ? applied : null;
  return useQuery({
    ...filterQuery(areas?.homelands ?? false, areas?.hazards ?? [], areas?.ranges ?? {}),
    enabled: areas !== null,
    placeholderData: areas ? keepPreviousData : undefined,
    select: geoidsOf,
  });
}

// The areas that passed the last Filter press, or null when no area filter is applied
export const useFilteredGeoids = () => useAreaFilter().data ?? null;

export interface PointCriteria {
  areas: AreaCriteria | null; // null: anywhere
  noAreasMatched: boolean;
  hazards: string[];
  rasters: string[];
}

// What one point layer's points must match after the last Filter press; null shows them all.
// Undefined while a new filter's areas load, so the points the previous filter matched stay on screen.
export function usePointFilter(layerId: string): PointCriteria | null | undefined {
  const applied = useFilterStore((state) => state.applied);
  const { data: geoids, isPlaceholderData } = useAreaFilter();
  return useMemo(() => {
    if (!applied) return null;
    const { hazards, rasters } = applied;
    if (applied.kind === "points") {
      return applied.pointLayers.includes(layerId)
        ? { areas: null, noAreasMatched: false, hazards, rasters }
        : null;
    }
    if (!geoids || isPlaceholderData) return undefined;
    const areas = { homelands: applied.homelands, ranges: applied.ranges };
    return { areas, noAreasMatched: geoids.size === 0, hazards, rasters };
  }, [applied, layerId, geoids, isPlaceholderData]);
}
