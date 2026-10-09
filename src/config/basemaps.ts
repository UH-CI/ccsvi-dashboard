export interface BaseMapOption {
  id: string;
  label: string;
  url: string;
  attribution?: string;
  maxNativeZoom?: number;
  maxZoom?: number;
}

export interface BaseMapLabelVariant {
  label: string;
  noLabelsId: string;
  labelsId: string;
}

export const BASE_MAP_OPTIONS: BaseMapOption[] = [
  {
    id: "cartodb_voyager_nolabels",
    label: "CartoDB Voyager (No Labels)",
    url: "/api/tiles/carto/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' + 
      '&copy; <a href="https://carto.com/attributions">CARTO</a>',
    
  },
  {
    id: "cartodb_voyager_labels",
    label: "CartoDB Voyager (Labels)",
    url: "/api/tiles/carto/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' +
      '&copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  {
    id: "cartodb_positron_nolabels",
    label: "CartoDB Positron (No Labels)",
    url: "/api/tiles/carto/light_nolabels/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' +
      '&copy; <a href="https://carto.com/attributions">CARTO</a>',
    
  },
  {
    id: "cartodb_positron_labels",
    label: "CartoDB Positron (Labels)",
    url: "/api/tiles/carto/rastertiles/light_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' +
      '&copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  {
    id: "esri_shaded",
    label: "Esri Shaded Relief",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Source: USGS, Esri, TANA, DeLorme, and NPS",
    maxNativeZoom: 13,
    maxZoom: 13,
  },
  {
    id: "esri_world_imagery",
    label: "Esri World Imagery",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    
  },
  {
    id: "openstreet",
    label: "OpenStreetMap",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  {
    id: "esri_world_streetmap",
    label: "Esri World Streetmap",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012',
  },
  {
    id: "esri_natgeoworldmap",
    label: "Esri National Geographic World Map",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}",
    attribution: 'Tiles &copy; Esri &mdash; National Geographic, Esri, DeLorme, NAVTEQ, UNEP-WCMC, USGS, NASA, ESA, METI, NRCAN, GEBCO, NOAA, iPC',
    maxNativeZoom: 16,
    maxZoom: 16,
  },
];

export const BASE_MAP_LABEL_VARIANTS: BaseMapLabelVariant[] = [
  {
    label: "CartoDB Voyager",
    noLabelsId: "cartodb_voyager_nolabels",
    labelsId: "cartodb_voyager_labels",
  },
  {
    label: "CartoDB Positron",
    noLabelsId: "cartodb_positron_nolabels",
    labelsId: "cartodb_positron_labels",
  },
];

export const DEFAULT_BASE_MAP_ID = BASE_MAP_OPTIONS[0].id;
