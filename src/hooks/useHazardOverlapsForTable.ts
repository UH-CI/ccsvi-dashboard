import { useEffect, useMemo, useState } from "react";
import { useHazardLayersStore } from "../stores/useHazardLayersStore";
import { deriveVisibleHazards } from "../components/DataAnalyzerMenu/deriveHazard";
import { getHazardAreas } from "../api/client";

// Resolves to the touching areas, or null if the database has no data for that hazard.
// A failed request is forgotten, so toggling the layer again asks again.
const areasCache: Record<string, Promise<Set<string> | null>> = {};

function fetchAreasOnce(entry: string): Promise<Set<string> | null> {
  if (!areasCache[entry]) {
    areasCache[entry] = getHazardAreas([entry])
      .then((result) => (result[entry] ? new Set(result[entry]) : null))
      .catch((err) => {
        console.error(`Failed to fetch hazard areas for ${entry}:`, err);
        delete areasCache[entry];
        return null;
      });
  }
  return areasCache[entry];
}

export interface TableHazard {
  key: string; // hazard id, with ".<sub id>" for a sub-layer
  label: string;
}

export interface TableHazardOverlaps {
  hazards: TableHazard[];
  touches: (key: string, geoid: string) => boolean;
}

// One Yes/No column per hazard or sub-layer currently toggled on the map. A hazard shows up
// only once its data has loaded, and never if the database has none (that would read as "No").
export function useHazardOverlapsForTable(mapId: string): TableHazardOverlaps {
  const visibleIds = useHazardLayersStore((state) => state.visibleLayerIdsByMap[mapId]);
  const visible = useMemo(
    () =>
      deriveVisibleHazards(visibleIds).map((hazard) => ({
        key: hazard.subId ? `${hazard.hazardId}.${hazard.subId}` : hazard.hazardId,
        label: hazard.label,
      })),
    [visibleIds],
  );

  const [areasByKey, setAreasByKey] = useState<Record<string, Set<string> | null>>({});

  useEffect(() => {
    let cancelled = false;
    for (const { key } of visible) {
      fetchAreasOnce(key).then((areas) => {
        if (!cancelled) setAreasByKey((prev) => ({ ...prev, [key]: areas }));
      });
    }
    return () => {
      cancelled = true;
    };
  }, [visible]);

  return useMemo(() => {
    const hazards = visible.filter((hazard) => areasByKey[hazard.key]);
    const touches = (key: string, geoid: string): boolean => areasByKey[key]?.has(geoid) ?? false;
    return { hazards, touches };
  }, [visible, areasByKey]);
}
