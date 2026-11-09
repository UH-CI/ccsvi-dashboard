import { queryOptions, useQuery } from "@tanstack/react-query";
import type { RasterSource } from "../../types";
import { getRasterInfo } from "../client";

// A raster's value range and extent
export const rasterInfoQuery = (source: RasterSource) =>
  queryOptions({
    queryKey: ["raster-info", source],
    queryFn: () => getRasterInfo(source),
  });

// Never asked for; stands in until a raster is given
const NO_RASTER: RasterSource = { kind: "cog", id: "" };

// Waits until a raster is given
export const useRasterInfo = (source: RasterSource | undefined) =>
  useQuery({ ...rasterInfoQuery(source ?? NO_RASTER), enabled: Boolean(source) }).data;
