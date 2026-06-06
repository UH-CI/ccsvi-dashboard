import { MapConfig } from "../../../types";

// Resolves a panel's stored map preference against the live map list,
// falling back to the primary map, then the first available map.
export function useResolvedMapId(
  preferredId: string,
  pool: MapConfig[],
  primaryMapId: string,
): string {
  return (
    pool.find((c) => c.id === preferredId)?.id ??
    pool.find((c) => c.id === primaryMapId)?.id ??
    pool[0]?.id ??
    ""
  );
}
