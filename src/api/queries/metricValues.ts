import { queryOptions, useQuery } from "@tanstack/react-query";
import { getMetricValues } from "../client";

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
