import { HAZARD_LAYERS } from "../../config/hazardLayers";
import type { HazardLayerMenuPanel } from "../../types";

export interface DerivedHazard {
  hazardId: string;
  subId: string | null;
  label: string;
}

// Collects every visible hazard/sub-layer, in HAZARD_LAYERS config order.
// With a menu panel, only layers shown in that control panel menu.
export function deriveVisibleHazards(
  visibleIds: Set<string> | undefined,
  panel?: HazardLayerMenuPanel,
): DerivedHazard[] {
  if (!visibleIds || visibleIds.size === 0) return [];

  const layers = panel
    ? HAZARD_LAYERS.filter((layer) => (layer.menuPanel ?? "hazards") === panel)
    : HAZARD_LAYERS;
  const derived: DerivedHazard[] = [];

  for (const parent of layers) {
    for (const sub of parent.subLayers ?? []) {
      if (visibleIds.has(`${parent.id}.${sub.id}`)) {
        derived.push({ hazardId: parent.id, subId: sub.id, label: `${parent.name} — ${sub.name}` });
      }
    }
  }

  for (const parent of layers) {
    if (visibleIds.has(parent.id)) {
      derived.push({ hazardId: parent.id, subId: null, label: parent.name });
    }
  }

  return derived;
}