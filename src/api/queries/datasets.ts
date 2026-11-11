import { queryOptions, useQuery } from "@tanstack/react-query";
import { getDatasets } from "../client";

// Every dataset and its metrics, from /api/v1/datasets
export const datasetsQuery = queryOptions({
  queryKey: ["datasets"],
  queryFn: getDatasets,
});

export const useDatasets = () => useQuery(datasetsQuery).data;
