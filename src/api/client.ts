import { Feature, FeatureCollection, Geometry, Point } from "geojson";
import {
  AreaCriteria,
  AreaResult,
  DatasetCatalog,
  DatasetTable,
  GeographiesData,
  MetricCatalog,
  MetricValue,
  RasterInfo,
  RasterSource,
  ValueRange,
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
  get<DatasetTable>(`/api/v1/datasets/${dataset}/table`);

export const getMetrics = () => get<MetricCatalog>("/api/v1/metrics");

export const getMetricValues = (key: string) =>
  get<Record<string, MetricValue>>(`/api/v1/metrics/${encodeURIComponent(key)}/values`);

// The server's name for the kind of area
const areaType = (homelands: boolean) => (homelands ? "hawaiian_homeland" : "block_group");

// One layer's point names, grouped by the geoid of the area they're in
export const getPointsByGeoid = (layerId: string, homelands: boolean) =>
  get<Record<string, string[]>>(
    `/api/v1/points/by-geoid?layer_id=${encodeURIComponent(layerId)}&area_type=${areaType(homelands)}`,
  );

// The block groups and Homelands touching each hazard; hazards with no data loaded are left out
export const getHazardAreas = (hazards: string[]) => {
  const params = new URLSearchParams();
  for (const hazard of hazards) params.append("hazard", hazard);
  return get<Record<string, string[]>>(`/api/v1/geographies/by-hazard?${params}`);
};

// Adds each column's range as min_<column> and, when it has one, max_<column>, as both the filter and the points requests send them
const setRanges = (params: URLSearchParams, ranges: Record<string, ValueRange>) => {
  for (const [column, { min, max }] of Object.entries(ranges)) {
    params.set(`min_${column}`, String(min));
    if (max !== undefined) params.set(`max_${column}`, String(max));
  }
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
    params.set("area_type", areaType(areas.homelands));
    setRanges(params, areas.ranges);
  }
  for (const hazard of hazards) params.append("hazard", hazard);
  for (const raster of rasters) params.append("raster", raster);
  return get<FeatureCollection<Point>>(`/api/v1/points?${params}`);
};

// The block groups or Homelands touching every given hazard, within each column's range
export const getFilterResults = (
  homelands: boolean,
  hazards: string[],
  ranges: Record<string, ValueRange>,
) => {
  const params = new URLSearchParams({ area_type: areaType(homelands) });
  for (const hazard of hazards) params.append("hazard", hazard);
  setRanges(params, ranges);
  return get<AreaResult[]>(`/api/v1/geographies/filter?${params}`);
};

// One point layer's file from the data folder
export const getPointFile = (filePath: string) =>
  fetchJson<FeatureCollection<Point>>(dataUrl(`point_data/${filePath}`));

// Fails when a hazard layer's map file can't be reached, without downloading it
export const checkHazardFile = async (file: string): Promise<null> => {
  const url = dataUrl(`hazards/${file}.pmtiles`);
  const res = await fetch(url, { method: "HEAD" });
  if (!res.ok) throw new ApiError(res.status, url);
  return null;
};

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
