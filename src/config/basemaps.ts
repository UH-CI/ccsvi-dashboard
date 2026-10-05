export interface BaseMapOption {
  id: string;
  label: string;
  url: string;
  attribution?: string;
}

export const BASE_MAP_OPTIONS: BaseMapOption[] = [
  {
    id: "openstreet",
    label: "OpenStreetMap",
    url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  {
    id: "openstreet_bzh",
    label: "OpenStreetMap BZH",
    url: "https://tile.openstreetmap.bzh/br/{z}/{x}/{y}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, ' +
      'Tiles courtesy of <a href="https://www.openstreetmap.bzh/" target="_blank">Breton OpenStreetMap Team</a>',
  },
  {
    id: "esri_shaded",
    label: "Esri Shaded Relief",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Source: Esri",
  },
  {
    id: "stadia_stamen_terrain",
    label: "Stadia Stamen Terrain",
    url: "https://tiles.stadiamaps.com/tiles/stamen_terrain/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.stadiamaps.com/" target="_blank">Stadia Maps</a> ' +
      '&copy; <a href="https://www.stamen.com/" target="_blank">Stamen Design</a> ' +
      '&copy; <a href="https://openmaptiles.org/" target="_blank">OpenMapTiles</a> ' +
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
];
