import geoblaze from "geoblaze";
import parseGeoraster from "georaster";
import type { Feature, Geometry } from "geojson";
import { cloneArrayBuffer } from "./hcdpRaster";

type ParsedGeoraster = Awaited<ReturnType<typeof parseGeoraster>>;

const georasterByLoadId = new Map<number, ParsedGeoraster>();

export function clearHcdpGeorasterCache(loadId?: number): void {
  if (loadId == null) {
    georasterByLoadId.clear();
    return;
  }
  georasterByLoadId.delete(loadId);
}

async function getHcdpGeoraster(arrayBuffer: ArrayBuffer, loadId: number): Promise<ParsedGeoraster> {
  const cached = georasterByLoadId.get(loadId);
  if (cached) return cached;

  const georaster = await parseGeoraster(cloneArrayBuffer(arrayBuffer));
  georasterByLoadId.set(loadId, georaster);
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

/** Mean raster value for pixels intersecting the feature geometry. */
export async function meanHcdpForFeature(
  arrayBuffer: ArrayBuffer,
  loadId: number,
  feature: Feature<Geometry>,
): Promise<number | null> {
  const georaster = await getHcdpGeoraster(arrayBuffer, loadId);

  try {
    const means = await geoblaze.mean(georaster, feature.geometry);
    const mean = Array.isArray(means) ? means[0] : means;

    if (mean == null || typeof mean !== "number" || isNoDataValue(mean, georaster)) {
      return null;
    }

    return mean;
  } catch (err) {
    console.warn("HCDP zonal mean failed:", err);
    return null;
  }
}
