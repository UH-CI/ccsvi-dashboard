import { useMemo } from "react";
import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";
import { useFilterStore, type AppliedFilter } from "../../stores/useFilterStore";
import type { AreaCriteria, AreaResult } from "../../types";
import { getFilterResults } from "../client";
import { queryClient } from "../queryClient";

// The areas touching every hazard and at or above each column's minimum
export const filterQuery = (
  homelands: boolean,
  hazards: string[],
  minimums: Record<string, number>,
) =>
  queryOptions({
    queryKey: ["filter", homelands, [...hazards].sort(), minimums],
    queryFn: () => getFilterResults(homelands, hazards, minimums),
    meta: { failureMessage: "The filter couldn't be applied. Please try again." },
  });

const geoidsOf = (results: AreaResult[]) => new Set(results.map((result) => result.geoid));

// The areas of the last Filter press. While a new filter loads, the previous one's areas stay on screen.
export function useAreaFilter() {
  const applied = useFilterStore((state) => state.applied);
  const areas = applied?.kind === "areas" ? applied : null;
  return useQuery({
    ...filterQuery(areas?.homelands ?? false, areas?.hazards ?? [], areas?.minimums ?? {}),
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
    const areas = { homelands: applied.homelands, minimums: applied.minimums };
    return { areas, noAreasMatched: geoids.size === 0, hazards, rasters };
  }, [applied, layerId, geoids, isPlaceholderData]);
}

// Pressing Filter again after a failed request asks the server again
export function applyFilter(filter: AppliedFilter) {
  useFilterStore.getState().apply(filter);
  if (filter.kind === "areas") {
    const { queryKey } = filterQuery(filter.homelands, filter.hazards, filter.minimums);
    queryClient.resetQueries({
      queryKey,
      exact: true,
      predicate: (query) => query.state.status === "error",
    });
  }
}
