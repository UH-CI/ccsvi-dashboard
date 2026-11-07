import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";
import type { TableData } from "../../components/TableViewer/types";
import { getDatasetTable } from "../client";

// One dataset's whole table, from /api/v1/datasets/{id}/table
export const datasetTableQuery = (dataset: string) =>
  queryOptions({
    queryKey: ["dataset-table", dataset],
    queryFn: () => getDatasetTable(dataset),
  });

// Every cell as text, columns in the answer's order
const toTableData = (data: Record<string, string | number | null>[]): TableData => {
  const headers = data.length > 0 ? Object.keys(data[0]) : [];
  return { headers, rows: data.map((row) => headers.map((h) => String(row[h] ?? ""))) };
};

// While another dataset's table loads, the one before stays on screen
export const useDatasetTable = (dataset: string) =>
  useQuery({
    ...datasetTableQuery(dataset),
    enabled: Boolean(dataset),
    placeholderData: dataset ? keepPreviousData : undefined,
    select: toTableData,
  });
