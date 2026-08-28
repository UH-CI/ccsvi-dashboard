import { PointLayerConfig } from "../types";

export const POINT_LAYERS: PointLayerConfig[] = [
  {
    id: "fire_stations",
    name: "Fire Stations",
    visible: false,
    icon: "FaFireExtinguisher",
    color: "#FF0000",
    filePath: "Fire_Stations_(Statewide).geojson",
    popupConfig: { titleField: "name", fields: [] },
  },
  {
    id: "hospitals",
    name: "Hospitals",
    visible: false,
    icon: "FaHospital",
    color: "#00BFFF",
    filePath: "Hospitals.geojson",
    popupConfig: { titleField: "name", fields: [] },
  },
  {
    id: "police_stations",
    name: "Police Stations",
    visible: false,
    icon: "FaShieldAlt",
    color: "#000080",
    filePath: "Police_Stations_(Statewide).geojson",
    popupConfig: { titleField: "name", fields: [] },
  },
  {
    id: "shelters",
    name: "Emergency Shelters",
    visible: false,
    icon: "FaHouseUser",
    color: "#00CC00",
    filePath: "emergency_shelters.geojson",
    popupConfig: {
      titleField: "BUSNAME",
      fields: [
        { key: "ADDRESS", label: "Address" },
        { key: "PLACENAME", label: "Location" },
      ],
    },
  },
  {
    id: "preschools",
    name: "Preschools",
    visible: false,
    icon: "FaSchool",
    color: "#FFA500",
    filePath: "Preschools.geojson",
    popupConfig: {
      titleField: "name",
      fields: [
        { key: "address", label: "Address" },
        { key: "city", label: "City" },
      ],
    },
  },
  {
    id: "public_schools",
    name: "Public Schools",
    visible: false,
    icon: "FaSchool",
    color: "#8A2BE2",
    filePath: "Public_Schools.geojson",
    popupConfig: {
      titleField: "sch_name",
      fields: [
        { key: "address", label: "Address" },
        { key: "city", label: "City" },
      ],
    },
  },
  {
    id: "private_schools",
    name: "Private Schools",
    visible: false,
    icon: "FaSchool",
    color: "#DC143C",
    filePath: "Private_Schools.geojson",
    popupConfig: {
      titleField: "school",
      fields: [
        { key: "address", label: "Address" },
        { key: "city", label: "City" },
      ],
    },
  },
  {
    id: "bridges",
    name: "Bridges",
    visible: false,
    icon: "FaArchway",
    color: "#6c757d",
    filePath: "National_Bridge_Inventory.geojson",
    popupConfig: {
      titleField: "structure_",
      fields: [
        { key: "structure_", label: "Structure ID" },
        { key: "year_built", label: "Year Built" },
        { key: "bridge_con", label: "Bridge Condition" },
      ],
    },
  },
  {
    id: "sewage",
    name: "Sewage Disposal Systems",
    description:
      "Areas reliant on on site wastewater treatment, which may be vulnerable to flooding and other hazards.",
    visible: false,
    icon: "FaToilet",
    color: "#964B00",
    filePath: "HI_Onsite_Sewage_Disposal_Systems.geojson",
    popupConfig: {
      titleField: "island",
      fields: [
        { key: "osds_qty", label: "OSDS Quantity" },
        { key: "ttl_osds", label: "Total OSDS" },
        { key: "rsk_score", label: "Risk Score" },
      ],
    },
  },
  {
    id: "wastewater_plant",
    name: "Wastewater Treatment Plants",
    visible: false,
    icon: "FaIndustry",
    color: "#2E8B57",
    filePath: "Wastewater_Treatment_Plants.geojson",
    popupConfig: {
      titleField: "wwtp_name",
      fields: [
        { key: "county", label: "County" },
      ],
    },
  },
];