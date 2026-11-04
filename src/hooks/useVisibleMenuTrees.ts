import { useMemo } from "react";
import { usePointLayerStore, useHazardLayersStore, useRasterLayersStore } from "../stores";
import { LAYER_MENUS } from "../config/layerMenus";
import type { LayerMenu } from "../config/layerMenus";
import { resolveLayerMenu, visibleMenuTree } from "../utils/layerMenus";
import type { VisibleNode } from "../utils/layerMenus";

export interface VisibleMenuTree {
  menu: LayerMenu;
  nodes: VisibleNode[];
}

// What is visible on one map, menu by menu, in src/config/layerMenus.ts order
export function useVisibleMenuTrees(mapId: string): VisibleMenuTree[] {
  const pointLayerConfigs = usePointLayerStore((s) => s.pointLayerConfigs);
  const visiblePointIds = usePointLayerStore((s) => s.visibleLayerIdsByMap[mapId]);
  const hazardLayerConfigs = useHazardLayersStore((s) => s.hazardLayerConfigs);
  const visibleShapeIds = useHazardLayersStore((s) => s.visibleLayerIdsByMap[mapId]);
  const rasterLayerConfigs = useRasterLayersStore((s) => s.rasterLayerConfigs);
  const visibleRasterIds = useRasterLayersStore((s) => s.visibleLayerIdsByMap[mapId]);

  return useMemo(
    () =>
      LAYER_MENUS.map((menu) => ({
        menu,
        nodes: visibleMenuTree(
          resolveLayerMenu(menu, pointLayerConfigs, hazardLayerConfigs, rasterLayerConfigs),
          visiblePointIds,
          visibleShapeIds,
          visibleRasterIds,
        ),
      })),
    [
      pointLayerConfigs,
      hazardLayerConfigs,
      rasterLayerConfigs,
      visiblePointIds,
      visibleShapeIds,
      visibleRasterIds,
    ],
  );
}
