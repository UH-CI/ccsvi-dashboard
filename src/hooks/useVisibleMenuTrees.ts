import { useMemo } from "react";
import { useVisibleIds } from "../stores/useMapLayersStore";
import { LAYER_MENUS, resolveLayerMenu, visibleMenuTree } from "../utils/layerMenus";
import type { LayerMenu, VisibleNode } from "../utils/layerMenus";

export interface VisibleMenuTree {
  menu: LayerMenu;
  nodes: VisibleNode[];
}

// What is visible on one map, menu by menu, in config/layers/menus.json order
export function useVisibleMenuTrees(mapId: string): VisibleMenuTree[] {
  const visible = useVisibleIds(mapId);
  return useMemo(
    () =>
      LAYER_MENUS.map((menu) => ({
        menu,
        nodes: visibleMenuTree(resolveLayerMenu(menu), visible),
      })),
    [visible],
  );
}
