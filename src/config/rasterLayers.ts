import rasters from "../../config/layers/rasters.json";
import type { RasterLayerConfig } from "../types";

// The raster layers in config/layers/rasters.json, without the switched-off ones
export const RASTER_LAYERS: RasterLayerConfig[] = (rasters.layers as RasterLayerConfig[])
  .filter((layer) => !layer.off)
  .map((layer) =>
    layer.subLayers ? { ...layer, subLayers: layer.subLayers.filter((sub) => !sub.off) } : layer,
  );
