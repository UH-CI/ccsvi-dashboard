import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";
import { getDatasetTable } from "../client";

// One dataset's whole table, from /api/v1/datasets/{id}/table: its columns and one row per area
export const datasetTableQuery = (dataset: string) =>
  queryOptions({
    queryKey: ["dataset-table", dataset],
    queryFn: () => getDatasetTable(dataset),
  });

// While another dataset's table loads, the one before stays on screen
export const useDatasetTable = (dataset: string) =>
  useQuery({
    ...datasetTableQuery(dataset),
    enabled: Boolean(dataset),
    placeholderData: dataset ? keepPreviousData : undefined,
  });
