import { queryOptions, useQuery } from "@tanstack/react-query";
import type { FeatureCollection, Geometry } from "geojson";
import type {
  BlockGroupProperties,
  CountyBoundariesProperties,
  HawaiianHomelandProperties,
} from "../../types";
import { getAppFile } from "../client";

// The area outlines shipped with the app
const BOUNDARY_FILES = {
  blockGroups: "data/2020_Census_Block_Groups_Stripped.geojson",
  homelands: "data/2024_Census_Hawaiian_Homelands_Stripped.geojson",
  counties: "data/2020_Census_County_Boundaries_Stripped.geojson",
} as const;

interface BoundaryProperties {
  blockGroups: BlockGroupProperties;
  homelands: HawaiianHomelandProperties;
  counties: CountyBoundariesProperties;
}

export type BoundaryName = keyof typeof BOUNDARY_FILES;

export const boundaryQuery = <N extends BoundaryName>(name: N) =>
  queryOptions({
    queryKey: ["boundary", name],
    queryFn: () =>
      getAppFile<FeatureCollection<Geometry, BoundaryProperties[N]>>(BOUNDARY_FILES[name]),
  });

export const useBoundary = <N extends BoundaryName>(name: N) => useQuery(boundaryQuery(name)).data;
