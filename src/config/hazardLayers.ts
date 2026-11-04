import lines from "../../config/layers/lines.json";
import polygons from "../../config/layers/polygons.json";
import type { HazardLayerConfig } from "../types";
import { switchedOn } from "./layerFiles";

// The line and polygon layers in config/layers/, without the switched-off ones. Lines come last so
// they draw on top of polygons
export const HAZARD_LAYERS = switchedOn([
  ...(polygons.layers as HazardLayerConfig[]),
  ...(lines.layers as HazardLayerConfig[]),
]);
