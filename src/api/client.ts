import { FeatureCollection, Point } from "geojson";
import { DatasetCatalog, MetricValue } from "../types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

// A failed request, with the server's status so callers can tell a bad request (4xx) from a server failure
export class ApiError extends Error {
  constructor(
    readonly status: number,
    path: string,
  ) {
    super(`API error ${status}: ${path}`);
  }
}

const get = async <T>(path: string): Promise<T> => {
  const res = await fetch(`${BASE_URL}${path}`);
  if (!res.ok) throw new ApiError(res.status, path);
  return res.json() as Promise<T>;
};

export const getDatasets = () => get<DatasetCatalog>("/api/v1/datasets");

export const getDatasetTable = (dataset: string) =>
  get<Record<string, string | number | null>[]>(`/api/v1/datasets/${dataset}/table`);

export const getMetricValues = (dataset: string, metric: string) =>
  get<Record<string, MetricValue>>(
    `/api/v1/metric-values?dataset=${encodeURIComponent(dataset)}&metric=${encodeURIComponent(metric)}`,
  );

// One layer's point names, grouped by the geoid of the area they're in
export const getPointsByGeoid = (layerId: string, homelands: boolean) =>
  get<Record<string, string[]>>(
    `/api/v1/points/by-geoid?layer_id=${encodeURIComponent(layerId)}&homelands=${homelands}`,
  );

// The block groups and Homelands touching each hazard; hazards with no data loaded are left out
export const getHazardAreas = (hazards: string[]) => {
  const params = new URLSearchParams();
  for (const hazard of hazards) params.append("hazard", hazard);
  return get<Record<string, string[]>>(`/api/v1/hazard-areas?${params}`);
};

// Asks for one layer's points, limited to the given areas, hazards and rasters. No areas given means no area limit.
export const getFilteredPoints = (
  layerId: string,
  geoids: string[] | null,
  hazards: string[],
  rasters: string[],
) => {
  const params = new URLSearchParams({ layer_id: layerId });
  for (const geoid of geoids ?? []) params.append("geoid", geoid);
  for (const hazard of hazards) params.append("hazard", hazard);
  for (const raster of rasters) params.append("raster", raster);
  return get<FeatureCollection<Point>>(`/api/v1/points?${params}`);
};
