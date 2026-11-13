import { queryOptions } from "@tanstack/react-query";
import { getPointsByGeoid } from "../client";

// One point layer's point names, grouped by the area they're in, from /api/v1/points/by-geoid
export const pointNamesQuery = (layerId: string, homelands: boolean) =>
  queryOptions({
    queryKey: ["point-names", layerId, homelands],
    queryFn: () => getPointsByGeoid(layerId, homelands),
  });
