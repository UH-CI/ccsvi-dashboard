export const DEFAULT_COLOR_SCHEME = "RdBu";

export const COLOR_SCHEMES = [
  { name: "Viridis", label: "Viridis", section: "Sequential", flip: false },
  { name: "YlOrRd", label: "Yellow-Orange-Red", section: "Sequential", flip: false },
  { name: "Blues", label: "Blues", section: "Sequential", flip: false },
  // {name: "YlGnBu", label: "Yellow-Green-Blue", section: "Sequential", flip: false},
  // {name: "Reds", label: "Reds", section: "Sequential", flip: false},
  // {name: "Greens", label: "Greens", section: "Sequential", flip: false},
  // {name: "Purples", label: "Purples", section: "Sequential", flip: false},
  // {name: "Oranges", label: "Oranges", section: "Sequential", flip: false},
  // {name: "GnBu", label: "Green-Blue", section: "Sequential", flip: false},
  // {name: "BuPu", label: "Blue-Purple", section: "Sequential", flip: false},
  { name: "Spectral", label: "Spectral", section: "Diverging", flip: true },
  { name: "RdBu", label: "Red-Blue", section: "Diverging", flip: true },
  { name: "RdYlBu", label: "Red-Yellow-Blue", section: "Diverging", flip: true },
  // {name: "RdYlGn", label: "Red-Yellow-Green", section: "Diverging", flip: true},
  // {name: "PRGn", label: "Purple-Red-Green", section: "Diverging", flip: true},
] as const;

export const DEFAULT_BIVARIATE_SCHEME = "PurpleBlue";

// Two-metric maps: rows go up with the second metric, columns go right with the first
export const BIVARIATE_SCHEMES: { name: string; label: string; palette: string[][] }[] = [
  {
    name: "PurpleBlue",
    label: "PurpleBlue",
    palette: [
      ["#e8e8e8", "#ace4e4", "#5ac8c8"],
      ["#dfb0d6", "#a5add3", "#5698b9"],
      ["#be64ac", "#8c62aa", "#3b4994"],
    ],
  },
  {
    name: "OrangePurple",
    label: "OrangePurple",
    palette: [
      ["#e8e8e8", "#e4d9ac", "#c8b35a"],
      ["#d6b0d6", "#d3a5a5", "#b95656"],
      ["#ac64be", "#aa628c", "#99003f"],
    ],
  },
  {
    name: "GreenBlue",
    label: "GreenBlue",
    palette: [
      ["#e8e8e8", "#b5c0da", "#6c83b5"],
      ["#b8d6be", "#90b2b3", "#567994"],
      ["#73ae80", "#5a9178", "#2a5a5b"],
    ],
  },
];

// Raster colour bars the user can pick; each name is one the tile server knows
export const RASTER_COLORMAPS: { name: string; label: string }[] = [
  { name: "blues", label: "Blues" },
  { name: "reds", label: "Reds" },
  { name: "greens", label: "Greens" },
  { name: "oranges", label: "Oranges" },
  { name: "purples", label: "Purples" },
  { name: "ylorrd", label: "YlOrRd" },
  { name: "ylgn", label: "YlGn" },
  { name: "bupu", label: "BuPu" },
  { name: "gnbu", label: "GnBu" },
  { name: "viridis", label: "Viridis" },
  { name: "plasma", label: "Plasma" },
  { name: "inferno", label: "Inferno" },
  { name: "magma", label: "Magma" },
];

// An area with no value for the metric
export const NO_VALUE_COLOR = "#cccccc";

// An area outside the Data Analyzer's range
export const OUTSIDE_RANGE_FILL = "#e0e0e0";
export const OUTSIDE_RANGE_OUTLINE = "#cccccc";

// Data Analyzer charts: areas in the range, areas outside it, and the selected area
export const CHART_COLORS = { matching: "#1976d2", notMatching: "#d0d0d0", selected: "#e53935" };
