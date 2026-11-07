import { queryOptions, useQuery } from "@tanstack/react-query";
import { getRasterInfo } from "../client";

// A raster's value range and extent
export const rasterInfoQuery = (rasterId: string) =>
  queryOptions({
    queryKey: ["raster-info", rasterId],
    queryFn: () => getRasterInfo(rasterId),
  });

// Waits until a raster is given
export const useRasterInfo = (rasterId: string | undefined) =>
  useQuery({ ...rasterInfoQuery(rasterId ?? ""), enabled: Boolean(rasterId) }).data;
