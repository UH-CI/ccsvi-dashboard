import { queryOptions, useQuery } from "@tanstack/react-query";
import type { Feature, Geometry } from "geojson";
import { rasterConfig } from "../../config/rasterLayers";
import type { RasterSource } from "../../types";
import { getAreaStats, getRasterInfo } from "../client";
import { layerFailureMessage } from "../queryClient";

// A raster's value range and extent. A saved raster that can't be loaded says so; HCDP's form shows its own message.
export const rasterInfoQuery = (source: RasterSource) =>
  queryOptions({
    queryKey: ["raster-info", source],
    queryFn: () => getRasterInfo(source),
    meta:
      source.kind === "cog"
        ? { failureMessage: layerFailureMessage(rasterConfig(source.id).name) }
        : undefined,
  });

// Never asked for; stands in until a raster is given
const NO_RASTER: RasterSource = { kind: "hcdp", params: {} };

// A raster's mean and max over one area: the area's shape is sent, and its geoid names it in the cache
export const areaStatsQuery = (source: RasterSource, geoid: string, area: Feature<Geometry>) =>
  queryOptions({
    queryKey: ["area-stats", source, geoid],
    queryFn: () => getAreaStats(source, area),
  });

// Waits until a raster is given
export const useRasterInfo = (source: RasterSource | undefined) =>
  useQuery({ ...rasterInfoQuery(source ?? NO_RASTER), enabled: Boolean(source) }).data;
