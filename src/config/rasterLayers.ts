import { RasterLayerConfig } from "../types";

export const RASTER_LAYERS: RasterLayerConfig[] = [
  {
    id: "stormSurge",
    name: "Storm Surge",
    icon: "FaCloudShowersHeavy",
    color: "#37474F",
    units: "m",
    opacity: 0.7,
    subLayers: [
      {
        id: "inundation_category1",
        name: "Inundation Category 1",
        color: "#0000FF",
        units: "m",
        opacity: 0.7,
        colormapName: "blues",
      },
      {
        id: "inundation_category2",
        name: "Inundation Category 2",
        color: "#0066FF",
        units: "m",
        opacity: 0.7,
        colormapName: "blues",
      },
      {
        id: "inundation_category3",
        name: "Inundation Category 3",
        color: "#0099FF",
        units: "m",
        opacity: 0.7,
        colormapName: "blues",
      },
      {
        id: "inundation_category4",
        name: "Inundation Category 4",
        color: "#00CCFF",
        units: "m",
        opacity: 0.7,
        colormapName: "blues",
      },
    ],
  },
  {
    id: "Landslide",
    name: "Landslide",
    icon: "FaMountain",
    color: "#6D4C41",
    units: "Susceptibility Index",
    opacity: 0.7,
    colormapName: "ylorrd",
  },
];