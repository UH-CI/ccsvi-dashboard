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
