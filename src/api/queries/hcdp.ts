import { queryOptions, useQuery } from "@tanstack/react-query";
import { getHcdpDateRange } from "../client";
import { hcdpSelection, type HcdpRangeRow } from "../../utils/hcdpRaster";

// The first and last date HCDP has for one dataset
export const hcdpDateRangeQuery = (selection: Record<string, string>) =>
  queryOptions({
    queryKey: ["hcdp-date-range", selection],
    queryFn: () => getHcdpDateRange(selection),
  });

// Waits until a catalog row is chosen
export const useHcdpDateRange = (row: HcdpRangeRow | undefined) =>
  useQuery({
    ...hcdpDateRangeQuery(row ? hcdpSelection(row) : {}),
    enabled: Boolean(row),
  });
