import { HAZARD_LAYERS } from "../../config/hazardLayers";

export interface DerivedHazard {
  hazardId: string;
  subId: string | null;
  label: string;
}

// Prefer a visible sub-layer over its parent — more specific
export function deriveHazard(visibleIds: Set<string> | undefined): DerivedHazard | null {
  if (!visibleIds || visibleIds.size === 0) return null;

  for (const id of visibleIds) {
    if (!id.includes(".")) continue;
    const [parentId, subId] = id.split(".");
    const parent = HAZARD_LAYERS.find((h) => h.id === parentId);
    const sub = parent?.subLayers?.find((s) => s.id === subId);
    if (parent && sub) return { hazardId: parentId, subId, label: `${parent.name} — ${sub.name}` };
  }

  for (const id of visibleIds) {
    if (id.includes(".")) continue;
    const parent = HAZARD_LAYERS.find((h) => h.id === id);
    if (parent) return { hazardId: id, subId: null, label: parent.name };
  }

  return null;
}