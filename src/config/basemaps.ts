export interface BaseMapOption {
  id: string;
  label: string;
  url: string;
  attribution?: string;
  subdomains?: string;
}

export const BASE_MAP_OPTIONS: BaseMapOption[] = [
  {
    id: "openstreet",
    label: "OpenStreetMap",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
    subdomains: "abc",
  },
  {
    id: "carto_voyager",
    label: "Carto Voyager",
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    subdomains: "abc",
  },
  {
    id: "esri_shaded",
    label: "Esri Shaded Relief",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Source: Esri",
    subdomains: "abc",
  },
  {
    id: "stadia_stamen_terrain",
    label: "Stadia Stamen Terrain",
    url: "https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}{r}.png",
    attribution: "&copy; Stadia Maps &copy; Stamen Design &copy; OpenMapTiles &copy; OpenStreetMap contributors",
    subdomains: "abc",
  },
];
