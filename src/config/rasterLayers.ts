import rasters from "../../config/layers/rasters.json";
import type { RasterLayerConfig } from "../types";
import { switchedOn } from "./layerFiles";

// The raster layers in config/layers/rasters.json, without the switched-off ones
export const RASTER_LAYERS = switchedOn(rasters.layers as RasterLayerConfig[], "subLayers");
