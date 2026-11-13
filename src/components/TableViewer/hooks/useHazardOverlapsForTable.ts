import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { useVisibleMenuTrees } from "../../../hooks/useVisibleMenuTrees";
import { flattenVisibleLayers } from "../../../utils/layerMenus";
import { hazardAreasQuery } from "../../../api/queries/hazardAreas";
import { dataOf } from "../../../api/queryClient";

export interface TableHazard {
  key: string; // hazard id, with ".<sub id>" for a sub-layer
  label: string;
}

export interface TableHazardOverlaps {
  hazards: TableHazard[];
  touches: (key: string, geoid: string) => boolean;
}

// One Yes/No column per hazard or sub-layer currently toggled on the map. A hazard shows up
// only once its data has loaded, and never if the database has none (that would read as "No").
export function useHazardOverlapsForTable(mapId: string): TableHazardOverlaps {
  const menuTrees = useVisibleMenuTrees(mapId);
  const visible = useMemo(
    () =>
      menuTrees
        .flatMap(({ nodes }) => flattenVisibleLayers(nodes))
        .filter((layer) => layer.kind === "shape")
        .map(({ key, label }) => ({ key, label })),
    [menuTrees],
  );

  const areas = useQueries({
    queries: visible.map(({ key }) => hazardAreasQuery(key)),
    combine: dataOf,
  });

  return useMemo(() => {
    const areasByKey = new Map(visible.map(({ key }, i) => [key, areas[i] && new Set(areas[i])]));
    const hazards = visible.filter((hazard) => areasByKey.get(hazard.key));
    const touches = (key: string, geoid: string): boolean =>
      areasByKey.get(key)?.has(geoid) ?? false;
    return { hazards, touches };
  }, [visible, areas]);
}
