import { HAZARD_LAYERS } from "../../config/hazardLayers";

export interface DerivedHazard {
  hazardId: string;
  subId: string | null;
  label: string;
}

// Prefer a visible sub-layer over its parent
// Priority is defined by HAZARD_LAYERS config top down order
export function deriveHazard(visibleIds: Set<string> | undefined): DerivedHazard | null {
  if (!visibleIds || visibleIds.size === 0) return null;

  for (const parent of HAZARD_LAYERS) {
    for (const sub of parent.subLayers ?? []) {
      if (visibleIds.has(`${parent.id}.${sub.id}`)) {
        return { hazardId: parent.id, subId: sub.id, label: `${parent.name} — ${sub.name}` };
      }
    }
  }

  for (const parent of HAZARD_LAYERS) {
    if (visibleIds.has(parent.id)) {
      return { hazardId: parent.id, subId: null, label: parent.name };
    }
  }

  return null;
}