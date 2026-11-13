import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";
import { pointLayer } from "../../config/pointLayers";
import { getFilteredPoints, getPointFile } from "../client";
import { layerFailureMessage } from "../queryClient";
import type { PointCriteria } from "./filter";

// One point layer's file, with every one of its points
export const pointFileQuery = (layerId: string) =>
  queryOptions({
    queryKey: ["point-file", layerId],
    queryFn: () => getPointFile(pointLayer(layerId).filePath),
    meta: { failureMessage: layerFailureMessage(pointLayer(layerId).name) },
  });

export const usePointFile = (layerId: string) => useQuery(pointFileQuery(layerId)).data;

// One point layer's points inside the given areas, hazards and rasters, from /api/v1/points
export const filteredPointsQuery = (layerId: string, { areas, hazards, rasters }: PointCriteria) =>
  queryOptions({
    queryKey: ["filtered-points", layerId, areas, [...hazards].sort(), [...rasters].sort()],
    queryFn: () => getFilteredPoints(layerId, areas, hazards, rasters),
    meta: { failureMessage: layerFailureMessage(pointLayer(layerId).name) },
  });

// Matches no areas, so it's never asked
const NO_AREAS: PointCriteria = { areas: null, noAreasMatched: true, hazards: [], rasters: [] };

// Asks only when the filter covers this layer and some area matched; no areas matched means no points.
// While a new filter loads, the points the previous one matched stay on screen.
export const useFilteredPoints = (layerId: string, criteria: PointCriteria | null | undefined) =>
  useQuery({
    ...filteredPointsQuery(layerId, criteria ?? NO_AREAS),
    enabled: criteria != null && !criteria.noAreasMatched,
    placeholderData: criteria === null ? undefined : keepPreviousData,
  }).data;
