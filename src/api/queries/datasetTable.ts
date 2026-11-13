import { keepPreviousData, queryOptions, skipToken, useQuery } from "@tanstack/react-query";
import { getDatasetTable } from "../client";

// One dataset's whole table, from /api/v1/datasets/{id}/table: its columns and one row per area;
// nothing is asked while no dataset is chosen ("")
export const datasetTableQuery = (dataset: string) =>
  queryOptions({
    queryKey: ["dataset-table", dataset],
    queryFn: dataset ? () => getDatasetTable(dataset) : skipToken,
  });

// While another dataset's table loads, the one before stays on screen
export const useDatasetTable = (dataset: string) =>
  useQuery({
    ...datasetTableQuery(dataset),
    placeholderData: dataset ? keepPreviousData : undefined,
  });
