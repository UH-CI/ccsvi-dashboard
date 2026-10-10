import { POINT_LAYERS } from "../../config/pointLayers";
import { PointLayerConfig } from "../../types";

export interface DerivedPointLayer {
  id: string;
  name: string;
  icon: string;
  color: string;
}

// Collects every visible point layer belonging to map menu, in POINT_LAYERS config order.
function deriveVisiblePointLayers(
  visibleIds: Set<string> | undefined,
  menu: PointLayerConfig["menu"],
): DerivedPointLayer[] {
  if (!visibleIds || visibleIds.size === 0) return [];

  return POINT_LAYERS.filter((layer) => layer.menu === menu && visibleIds.has(layer.id)).map(
    (layer) => ({ id: layer.id, name: layer.name, icon: layer.icon, color: layer.color }),
  );
}

export function deriveVisibleCriticalInfrastructure(
  visibleIds: Set<string> | undefined,
): DerivedPointLayer[] {
  return deriveVisiblePointLayers(visibleIds, "criticalInfrastructure");
}

export function deriveVisibleLocationsOfEnhancedExposure(
  visibleIds: Set<string> | undefined,
): DerivedPointLayer[] {
  return deriveVisiblePointLayers(visibleIds, "locationsOfEnhancedExposure");
}