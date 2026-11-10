import { queryOptions, useQuery } from "@tanstack/react-query";
import { getDatasets } from "../client";

// Every dataset and its metrics, from /api/v1/datasets
export const datasetsQuery = queryOptions({
  queryKey: ["datasets"],
  queryFn: getDatasets,
});

export const useDatasets = () => useQuery(datasetsQuery).data;

// Whether a metric is a percentage or a count; undefined until the catalog loads or while none is chosen
export const useMetricKind = (dataset: string | undefined, metric: string | undefined) => {
  const catalog = useDatasets();
  return dataset && metric ? catalog?.[dataset]?.metrics[metric]?.kind : undefined;
};
