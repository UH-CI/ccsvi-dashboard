import type { RasterLayerConfig, SubRasterLayerConfig } from "../types";

// The raster a popup reports on: a visible sub-layer if there is one, else the first visible layer
export function getActiveRaster(
  visibleIds: Set<string> | undefined,
  configs: RasterLayerConfig[],
): { id: string; config: RasterLayerConfig | SubRasterLayerConfig | null } | null {
  const ids = Array.from(visibleIds ?? []);
  const id = ids.find((candidate) => candidate.includes(".")) ?? ids[0];
  if (!id) return null;

  const [parentId, subId] = id.split(".");
  const parent = configs.find((layer) => layer.id === parentId);
  if (!parent) return { id, config: null };
  const config = subId ? (parent.subLayers?.find((layer) => layer.id === subId) ?? parent) : parent;
  return { id, config };
}
