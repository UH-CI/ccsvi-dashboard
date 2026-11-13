import { queryOptions, skipToken, useQuery } from "@tanstack/react-query";
import type { MetricKind, MetricValue } from "../../types";
import { getMetricValues } from "../client";

// An area's number for a metric: its percentage for a percentage metric, its count for a count; null when it has none
export const metricNumber = (entry: MetricValue | undefined, kind: MetricKind): number | null =>
  (kind === "percentage" ? entry?.percentage : entry?.absolute) ?? null;

// One metric's value for every area, by its key, from /api/v1/metrics/{key}/values; nothing is asked until there's a key
export const metricValuesQuery = (key: string | null | undefined) =>
  queryOptions({
    queryKey: ["metric-values", key],
    queryFn: key ? () => getMetricValues(key) : skipToken,
  });

export const useMetricValues = (key: string | null | undefined) =>
  useQuery(metricValuesQuery(key)).data;
