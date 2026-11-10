import { queryOptions, useQuery } from "@tanstack/react-query";
import type { MetricKind, MetricValue } from "../../types";
import { getMetricValues } from "../client";

// An area's number for a metric: its percentage for a percentage metric, its count for a count; null when it has none
export const metricNumber = (entry: MetricValue | undefined, kind: MetricKind): number | null =>
  (kind === "percentage" ? entry?.percentage : entry?.absolute) ?? null;

// One metric's value for every area, from /api/v1/datasets/{id}/values
export const metricValuesQuery = (dataset: string, metric: string) =>
  queryOptions({
    queryKey: ["metric-values", dataset, metric],
    queryFn: () => getMetricValues(dataset, metric),
  });

// Waits until both are chosen
export const useMetricValues = (
  dataset: string | null | undefined,
  metric: string | null | undefined,
) =>
  useQuery({
    ...metricValuesQuery(dataset ?? "", metric ?? ""),
    enabled: Boolean(dataset && metric),
  }).data;
