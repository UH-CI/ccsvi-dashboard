import type { RasterLayerConfig } from "../../types";

export interface DerivedRaster {
  rasterId: string; // the id the server knows it by, e.g. "stormSurge.inundation_category1"
  label: string;
}

// Collects every visible raster layer that has saved values, in the order the config lists them.
export function deriveVisibleRasters(
  visibleIds: Set<string> | undefined,
  configs: RasterLayerConfig[],
): DerivedRaster[] {
  if (!visibleIds || visibleIds.size === 0) return [];

  const derived: DerivedRaster[] = [];
  for (const parent of configs) {
    for (const sub of parent.subLayers ?? []) {
      if (visibleIds.has(`${parent.id}.${sub.id}`)) {
        derived.push({ rasterId: `${parent.id}.${sub.id}`, label: `${parent.name} — ${sub.name}` });
      }
    }
    if (!parent.subLayers?.length && visibleIds.has(parent.id)) {
      derived.push({ rasterId: parent.id, label: parent.name });
    }
  }
  return derived;
}
