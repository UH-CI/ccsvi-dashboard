import type L from "leaflet";
import { MAP_PANES, type MapPane } from "../config/map";

// The pane's name, for a layer's pane option; the pane is made, in its drawing order, the first time
export function ensurePane(map: L.Map, name: MapPane): MapPane {
  if (!map.getPane(name)) map.createPane(name).style.zIndex = String(MAP_PANES[name]);
  return name;
}
