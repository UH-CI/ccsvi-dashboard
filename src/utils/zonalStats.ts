import geoblaze from "geoblaze";
import parseGeoraster from "georaster";
import type { Feature, Geometry } from "geojson";
import { cloneArrayBuffer } from "./hcdpRaster";

type ParsedGeoraster = Awaited<ReturnType<typeof parseGeoraster>>;

const georasterByCacheKey = new Map<string, ParsedGeoraster>();

export function clearHcdpGeorasterCache(loadId?: number): void {
  if (loadId == null) {
    georasterByCacheKey.clear();
    return;
  }
  georasterByCacheKey.delete(`hcdp:${loadId}`);
}

export function clearRasterGeorasterCache(cacheKey?: string): void {
  if (cacheKey == null) {
    georasterByCacheKey.clear();
    return;
  }
  georasterByCacheKey.delete(cacheKey);
}

async function getGeoraster(arrayBuffer: ArrayBuffer, cacheKey: string): Promise<ParsedGeoraster> {
  const cached = georasterByCacheKey.get(cacheKey);
  if (cached) return cached;

  const georaster = await parseGeoraster(cloneArrayBuffer(arrayBuffer));
  georasterByCacheKey.set(cacheKey, georaster);
  return georaster;
}

function isNoDataValue(v: number, georaster: ParsedGeoraster): boolean {
  if (Number.isNaN(v)) return true;
  if (v === georaster.noDataValue) return true;
  if (v === -9999 || v <= -3.4e38) return true;

  const firstValue = georaster.values?.[0]?.[0]?.[0];
  if (v === firstValue) return true;

  return false;
}

export async function meanRasterForFeature(
  arrayBuffer: ArrayBuffer,
  cacheKey: string,
  feature: Feature<Geometry>,
): Promise<number | null> {
  const georaster = await getGeoraster(arrayBuffer, cacheKey);

  try {
    const means = await geoblaze.mean(georaster, feature.geometry);
    const mean = Array.isArray(means) ? means[0] : means;

    if (mean == null || typeof mean !== "number" || isNoDataValue(mean, georaster)) {
      return null;
    }

    return mean;
  } catch (err) {
    console.warn("Raster zonal mean failed:", err);
    return null;
  }
}

// Mean raster value for pixels intersecting the feature geometry.
export async function meanHcdpForFeature(
  arrayBuffer: ArrayBuffer,
  loadId: number,
  feature: Feature<Geometry>,
): Promise<number | null> {
  return meanRasterForFeature(arrayBuffer, `hcdp:${loadId}`, feature);
}
