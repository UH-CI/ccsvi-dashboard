import { queryOptions, useQuery } from "@tanstack/react-query";
import { getGeographies } from "../client";

// Name, tract, block group and county of every area, from /api/v1/geographies
export const geographiesQuery = queryOptions({
  queryKey: ["geographies"],
  queryFn: getGeographies,
});

export const useGeographies = () => useQuery(geographiesQuery).data;
