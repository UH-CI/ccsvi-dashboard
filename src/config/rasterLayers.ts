import rasters from "../../config/layers/rasters.json";
import type { RasterLayerConfig, SubRasterLayerConfig } from "../types";
import { splitLayerId, subLayerId, switchedOn } from "./layerFiles";

// The raster layers in config/layers/rasters.json, without the switched-off ones
export const RASTER_LAYERS = switchedOn(rasters.layers as RasterLayerConfig[], "subLayers");

// The ids of the rasters that have a file: "<layer>" for a layer without sub-layers, else "<layer>.<sub>"
export const RASTER_IDS: ReadonlySet<string> = new Set(
  RASTER_LAYERS.flatMap((layer) =>
    layer.subLayers ? layer.subLayers.map((sub) => subLayerId(layer.id, sub.id)) : [layer.id],
  ),
);

// HCDP layers: 75% layer opacity over colours at 85%
export const HCDP_OPACITY = 0.75 * 0.85;

// A raster's config from its id, "<layer>" or "<layer>.<sub>"
export function rasterConfig(id: string): SubRasterLayerConfig {
  const [layerId, subId] = splitLayerId(id);
  const layer = RASTER_LAYERS.find((l) => l.id === layerId)!;
  return subId ? layer.subLayers!.find((sub) => sub.id === subId)! : layer;
}

// The colour bar a raster is drawn with on one map: the user's pick, else its own, else its layer's
export function rasterColormap(id: string, overrides: Record<string, string> | undefined): string {
  const [layerId] = splitLayerId(id);
  return (
    overrides?.[id] ??
    rasterConfig(id).colormap ??
    RASTER_LAYERS.find((layer) => layer.id === layerId)!.colormap!
  );
}
