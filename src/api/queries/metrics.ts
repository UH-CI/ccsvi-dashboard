import { useMemo } from "react";
import { queryOptions, useQuery } from "@tanstack/react-query";
import type { CatalogDataset, DatasetCatalog, MetricCatalog, MetricKind } from "../../types";
import { getMetrics } from "../client";
import { useDatasets } from "./datasets";

// Every metric the app looks up, by key, from /api/v1/metrics
export const metricsQuery = queryOptions({
  queryKey: ["metrics"],
  queryFn: getMetrics,
});

export const useMetrics = () => useQuery(metricsQuery).data;

// A metric's dataset, its name in the data, and whether it's shown as a percentage or a count
export interface MetricInfo {
  key: string;
  name: string;
  datasetId: string;
  dataset: CatalogDataset;
  kind: MetricKind;
}

// The metric with this key; undefined while the catalogs load or when no key is given
export const useMetric = (key: string | undefined): MetricInfo | undefined => {
  const metrics = useMetrics();
  const datasets = useDatasets();
  return useMemo(() => {
    const metric = key ? metrics?.[key] : undefined;
    if (!metric || !datasets) return undefined;
    return {
      key: key!,
      name: metric.name,
      datasetId: metric.dataset,
      dataset: datasets[metric.dataset],
      kind: metric.kind,
    };
  }, [key, metrics, datasets]);
};

// The key of a point layer's "Count" or a raster's "Mean" or "Max" for block groups or Homelands; null if it has none
export function layerMetricKey(
  metrics: MetricCatalog | undefined,
  datasets: DatasetCatalog | undefined,
  layerId: string,
  homelands: boolean,
  name: "Mean" | "Max" | "Count",
): string | null {
  const match = Object.entries(metrics ?? {}).find(([, metric]) => {
    const dataset = datasets?.[metric.dataset];
    return (
      metric.name === name &&
      dataset?.layer_id === layerId &&
      dataset.hawaiian_homelands === homelands
    );
  });
  return match?.[0] ?? null;
}
