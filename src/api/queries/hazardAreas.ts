import { queryOptions } from "@tanstack/react-query";
import { getHazardAreas } from "../client";

// The block groups and Homelands touching one hazard (or sub-layer), or null if the database has no data for it
export const hazardAreasQuery = (entry: string) =>
  queryOptions({
    queryKey: ["hazard-areas", entry],
    queryFn: async () => (await getHazardAreas([entry]))[entry] ?? null,
  });
