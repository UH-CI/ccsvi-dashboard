import { queryOptions, useQuery } from "@tanstack/react-query";
import { getMetricValues } from "../client";
import { queryClient } from "../queryClient";

// One metric's value for every area, from /api/v1/metric-values
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

// For code outside React components, such as the popups
export const fetchMetricValues = (dataset: string, metric: string) =>
  queryClient.fetchQuery(metricValuesQuery(dataset, metric));
