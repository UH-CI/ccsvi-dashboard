import { Feature, FeatureCollection, Geometry, Point } from "geojson";
import {
  AreaCriteria,
  BlockGroupResult,
  DatasetCatalog,
  GeographiesData,
  MetricValue,
  RasterInfo,
  RasterSource,
} from "../types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";
const DATA_BASE_URL = import.meta.env.VITE_DATA_BASE_URL ?? "";

// An address on the API server, e.g. "/api/tiles/carto/…" for map tiles
export const apiUrl = (path: string) => `${BASE_URL}${path}`;

// An address in the data folder, e.g. "hazards/flood.pmtiles"
export const dataUrl = (path: string) => `${DATA_BASE_URL}/${path}`;

// A failed request, with the server's status so callers can tell a bad request (4xx) from a server failure
export class ApiError extends Error {
  constructor(
    readonly status: number,
    path: string,
  ) {
    super(`API error ${status}: ${path}`);
  }
}

const fetchJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(url, init);
  if (!res.ok) throw new ApiError(res.status, url);
  return res.json() as Promise<T>;
};

const get = <T>(path: string): Promise<T> => fetchJson<T>(apiUrl(path));

const post = <T>(path: string, body: unknown): Promise<T> =>
  fetchJson<T>(apiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

// A file shipped with the app, e.g. "data/2020_Census_Block_Groups_Stripped.geojson"
export const getAppFile = <T>(path: string): Promise<T> =>
  fetchJson<T>(`${import.meta.env.BASE_URL}${path}`);

export const getDatasets = () => get<DatasetCatalog>("/api/v1/datasets");

export const getGeographies = () => get<GeographiesData>("/api/v1/geographies");

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

// Adds each column's minimum as min_<column>, as both the filter and the points requests send them
const setMinimums = (params: URLSearchParams, minimums: Record<string, number>) => {
  for (const [column, value] of Object.entries(minimums))
    params.set(`min_${column}`, String(value));
};

// Asks for one layer's points, limited to the given areas, hazards and rasters. No areas given means no area limit.
export const getFilteredPoints = (
  layerId: string,
  areas: AreaCriteria | null,
  hazards: string[],
  rasters: string[],
) => {
  const params = new URLSearchParams({ layer_id: layerId });
  if (areas) {
    params.set("homelands", String(areas.homelands));
    setMinimums(params, areas.minimums);
  }
  for (const hazard of hazards) params.append("hazard", hazard);
  for (const raster of rasters) params.append("raster", raster);
  return get<FeatureCollection<Point>>(`/api/v1/points?${params}`);
};

// The block groups or Homelands touching every given hazard, at or above each column's minimum
export const getFilterResults = (
  homelands: boolean,
  hazards: string[],
  minimums: Record<string, number>,
) => {
  const params = new URLSearchParams();
  for (const hazard of hazards) params.append("hazard", hazard);
  setMinimums(params, minimums);
  return get<BlockGroupResult[]>(
    `/api/v1/${homelands ? "hawaiian-homelands" : "block-groups"}?${params}`,
  );
};

// One point layer's file from the data folder
export const getPointFile = (filePath: string) =>
  fetchJson<FeatureCollection<Point>>(dataUrl(`point_data/${filePath}`));

// The query that names a raster to its tile server, e.g. "raster_id=Landslide"
export const rasterQuery = (source: RasterSource): string =>
  source.kind === "cog"
    ? `raster_id=${encodeURIComponent(source.id)}`
    : Object.entries(source.params)
        .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
        .join("&");

// A path on a raster's tile server, e.g. rasterPath(source, "statistics")
export const rasterPath = (source: RasterSource, path: string): string =>
  `/api/tiles/${source.kind}/${path}?${rasterQuery(source)}`;

// A raster's value range (for colouring its tiles) and its extent (so the map asks only for tiles inside it)
export const getRasterInfo = async (source: RasterSource): Promise<RasterInfo> => {
  const [statistics, info] = await Promise.all([
    get<{ b1: { min: number; max: number } }>(rasterPath(source, "statistics")),
    get<{ bounds: [number, number, number, number] }>(rasterPath(source, "info")),
  ]);
  const [west, south, east, north] = info.bounds;
  return {
    min: statistics.b1.min,
    max: statistics.b1.max,
    bounds: [
      [south, west],
      [north, east],
    ],
  };
};

// A raster's value at one spot
export const getRasterValue = (source: RasterSource, lng: number, lat: number) =>
  get<{ values?: (number | null)[] }>(rasterPath(source, `point/${lng},${lat}`));

// A raster's mean and max over one area's shape; null where the area has no data
export const getAreaStats = async (
  source: RasterSource,
  area: Feature<Geometry>,
): Promise<{ mean: number | null; max: number | null }> => {
  type AreaStatistics = { statistics: { b1: { mean: number | null; max: number | null } } };
  const answer = await post<{ properties: AreaStatistics }>(rasterPath(source, "statistics"), area);
  const { mean, max } = answer.properties.statistics.b1;
  return { mean, max };
};

// The first and last date HCDP has for one dataset (datatype, period and its extra choices)
export const getHcdpDateRange = (selection: Record<string, string>) =>
  get<[string, string]>(`/api/v1/hcdp/date-range?${new URLSearchParams(selection)}`);

// A colour bar's colours, bottom to top, as [red, green, blue, alpha]
export const getColormap = (name: string) =>
  get<[number, number, number, number][]>(
    `/api/v1/rasters/colormap?name=${encodeURIComponent(name)}`,
  );
