import { queryOptions, skipToken, useQuery } from "@tanstack/react-query";
import { getHcdpDateRange } from "../client";
import { hcdpSelection, type HcdpRangeRow } from "../../utils/hcdpRaster";

// The first and last date HCDP has for one dataset; nothing is asked until a dataset is chosen
export const hcdpDateRangeQuery = (selection: Record<string, string> | undefined) =>
  queryOptions({
    queryKey: ["hcdp-date-range", selection],
    queryFn: selection ? () => getHcdpDateRange(selection) : skipToken,
  });

export const useHcdpDateRange = (row: HcdpRangeRow | undefined) =>
  useQuery(hcdpDateRangeQuery(row && hcdpSelection(row)));
