export const DEFAULT_COLOR_SCHEME = "RdBu";

export const COLOR_SCHEMES = [
  { name: "Viridis", label: "Viridis", section: "Sequential", flip: false },
  { name: "YlOrRd", label: "Yellow-Orange-Red", section: "Sequential", flip: false },
  { name: "Blues", label: "Blues", section: "Sequential", flip: false },
  { name: "Spectral", label: "Spectral", section: "Diverging", flip: true },
  { name: "RdBu", label: "Red-Blue", section: "Diverging", flip: true },
  { name: "RdYlBu", label: "Red-Yellow-Blue", section: "Diverging", flip: true },
] as const;
