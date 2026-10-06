export interface BaseMapOption {
  id: string;
  label: string;
  url: string;
  attribution?: string;
  maxNativeZoom?: number;
  maxZoom?: number;
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
    id: "cartodb_positron_nolabels",
    label: "CartoDB Positron (No Labels)",
    url: "/api/tiles/carto/light_nolabels/{z}/{x}/{y}{r}.png",
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
];
