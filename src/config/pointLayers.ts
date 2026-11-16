import points from "../../config/layers/points.json";
import type { PointLayerConfig } from "../types";
import { on } from "./layerFiles";

// The point layers in config/layers/points.json, without the switched-off ones
export const POINT_LAYERS = on(points.layers as PointLayerConfig[]);

// A point layer's config from its id
export const pointLayer = (id: string): PointLayerConfig =>
  POINT_LAYERS.find((layer) => layer.id === id)!;
