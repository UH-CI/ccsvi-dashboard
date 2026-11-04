import type { Dataset } from "../types";

// The dataset holding a point or raster layer's saved values for block groups or Homelands; null if it has none
export function layerDatasetId(
  catalog: Dataset | null,
  layerId: string,
  homelands: boolean,
): string | null {
  const match = Object.entries(catalog ?? {}).find(
    ([, dataset]) =>
      dataset.layerId === layerId && Boolean(dataset.hawaiianHomelands) === homelands,
  );
  return match?.[0] ?? null;
}
