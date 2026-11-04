// What each layer menu shows, and in what order. Layer configs say what a layer is;
// this file says where it appears. Checked when the app loads (utils/layerMenus.ts).

export type LayerMenuId = "criticalInfrastructure" | "locations" | "hazards";

export interface LayerMenuGroup {
  group: string; // label shown in the menu; unique across all menus
  description?: string; // hover text on the group header
  icon?: string; // react-icons name; falls back to the first layer's icon
  color?: string; // falls back to the first layer's color
  items: string[]; // top-level layer ids, in display order
}

export interface LayerMenu {
  id: LayerMenuId;
  title: string; // button label, popup title and analyzer section title
  popupTitle?: string; // popup title, when it differs from the button label
  description: string; // info-popup text for the button
  hideCheckboxes?: boolean; // rows have no checkbox
  items: (string | LayerMenuGroup)[]; // top-level layer ids and groups, in display order
}

// Array order is button order and analyzer section order
export const LAYER_MENUS: LayerMenu[] = [
  {
    id: "criticalInfrastructure",
    title: "Critical Infrastructure",
    description:
      "Overlay point data for critical infrastructure including hospitals, fire stations, police stations, emergency shelters, schools, and road networks.",
    items: [
      "fire_stations",
      "hospitals",
      "police_stations",
      "shelters",
      "bridges",
      "sidewalks_and_paths",
      "state_roads",
      { group: "Schools", items: ["preschools", "public_schools", "private_schools"] },
      { group: "Airports", items: ["airports", "airport_areas"] },
      {
        group: "Harbors",
        items: ["commercial_harbors", "small_boat_harbors", "commercial_harbor_areas"],
      },
    ],
  },
  {
    id: "locations",
    title: "Secondary Environmental Risk Areas",
    description:
      "Show locations with environmental hazards or risk-prone infrastructure that can worsen climate impacts, such as onsite sewage disposal systems.",
    items: ["wastewater_plant", "pcl_filtered", "pcl_landfill"],
  },
  {
    id: "hazards",
    title: "Hazards",
    popupTitle: "Hazard Layers",
    description:
      "Display hazard layers including FEMA flood zones, sea level rise projections (passive flooding, highway exposure, erosion, exposure areas), solar insolation, storm surge, and landslide data.",
    hideCheckboxes: true,
    items: [
      "flood_hazard",
      {
        group: "Sea Level Rise",
        description:
          "Projected changes in sea level identify locations with increasing exposure to coastal inundation and long term flooding.",
        icon: "FaWaveSquare",
        color: "#1976d2",
        items: ["erosion", "potential_flood_highways", "exposure_area", "passive_flood"],
      },
      "solar_insolation",
      "fire_zone",
      "stormSurge",
      "Landslide",
    ],
  },
];
