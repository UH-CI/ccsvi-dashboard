import { useState } from "react";
import type { MapState } from "../../types";
import { useMapStore } from "../../stores/useMapStore";

// The map a menu's settings apply to: the tab picked while it's still among maps, else the main
// map, else the first; "" with no maps. Also returns the setter for the tabs.
export function useMenuMap(maps: MapState[]): [string, (id: string) => void] {
  const [picked, setPicked] = useState("");
  const primaryMapId = useMapStore((state) => state.primaryMapId);
  const map =
    maps.find((m) => m.id === picked) ?? maps.find((m) => m.id === primaryMapId) ?? maps[0];
  return [map?.id ?? "", setPicked];
}
