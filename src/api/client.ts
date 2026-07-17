import { DatasetCatalog } from "../types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

const get = async <T>(path: string): Promise<T> => {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json() as Promise<T>;
};

export const getDatasets = () => get<DatasetCatalog>("/api/v1/datasets");

// DEPRECATED: replaced by getDatasetTable → /api/v1/datasets/{id}/table
// export const getMetrics = (dataset: string) =>
//   get<Record<string, string>[]>(`/api/v1/metrics/${dataset}`);

export const getDatasetTable = (dataset: string) =>
  get<Record<string, string | number | null>[]>(`/api/v1/datasets/${dataset}/table`);

export const getMetricValues = (dataset: string, metric: string) =>
  get<Record<string, { absolute: number | null; margin_of_error: number | null; percentage: number | null }>>(
    `/api/v1/metric-values?dataset=${encodeURIComponent(dataset)}&metric=${encodeURIComponent(metric)}`,
  );

// DEPRECATED: reads from census_metrics table (dropped by migration); not currently used
// export const getBlockGroup = (geoid: string) =>
//   get<Record<string, unknown>>(`/api/v1/block-groups/${geoid}`);
