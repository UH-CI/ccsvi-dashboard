import { HAZARD_LAYERS } from "../../config/hazardLayers";

export interface DerivedHazard {
  hazardId: string;
  subId: string | null;
  label: string;
}

// Collects every visible hazard/sub-layer, in HAZARD_LAYERS config order.
export function deriveVisibleHazards(visibleIds: Set<string> | undefined): DerivedHazard[] {
  if (!visibleIds || visibleIds.size === 0) return [];

  const derived: DerivedHazard[] = [];

  for (const parent of HAZARD_LAYERS) {
    for (const sub of parent.subLayers ?? []) {
      if (visibleIds.has(`${parent.id}.${sub.id}`)) {
        derived.push({ hazardId: parent.id, subId: sub.id, label: `${parent.name} — ${sub.name}` });
      }
    }
  }

  for (const parent of HAZARD_LAYERS) {
    if (visibleIds.has(parent.id)) {
      derived.push({ hazardId: parent.id, subId: null, label: parent.name });
    }
  }

  return derived;
}