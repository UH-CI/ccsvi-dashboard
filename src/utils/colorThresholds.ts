import chroma from "chroma-js";

export interface ComputedColorScale {
  limits: number[];
  getColor: (value: number) => string;
  getLegendColors: () => string[];
}

export interface ComputedBivariateColorScale {
  limits1: number[];
  limits2: number[];
  palette: string[][];
  getColor: (value1: number | null, value2: number | null) => string;
}

export const BIVARIATE_PALETTES: Record<string, string[][]> = {
  PurpleBlue: [
    ["#e8e8e8", "#ace4e4", "#5ac8c8"],
    ["#dfb0d6", "#a5add3", "#5698b9"],
    ["#be64ac", "#8c62aa", "#3b4994"],
  ],
  OrangePurple: [
    ["#e8e8e8", "#e4d9ac", "#c8b35a"],
    ["#d6b0d6", "#d3a5a5", "#b95656"],
    ["#ac64be", "#aa628c", "#99003f"],
  ],
  GreenBlue: [
    ["#e8e8e8", "#b5c0da", "#6c83b5"],
    ["#b8d6be", "#90b2b3", "#567994"],
    ["#73ae80", "#5a9178", "#2a5a5b"],
  ],
};

// Builds a 3×3 bivariate color scale from two sets of raw values.
export function computeBivariateColorScale(
  values1: number[],
  values2: number[],
  paletteName: string,
  mode = "q",
): ComputedBivariateColorScale | null {
  if (values1.length === 0 || values2.length === 0) return null;

  const palette = BIVARIATE_PALETTES[paletteName] ?? BIVARIATE_PALETTES.PurpleBlue;
  const numClasses = palette.length; // 3

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const limits1 = chroma.limits(values1, mode as any, numClasses);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const limits2 = chroma.limits(values2, mode as any, numClasses);

  const classify = (value: number, limits: number[]): number => {
    for (let i = limits.length - 2; i >= 1; i--) {
      if (value >= limits[i]) return i;
    }
    return 0;
  };

  return {
    limits1,
    limits2,
    palette,
    getColor: (value1, value2) => {
      if (value1 === null || value2 === null) return "#cccccc";
      const col = classify(value1, limits1);
      const row = classify(value2, limits2);
      return palette[row][col];
    },
  };
}

// Builds a classified color scale from raw data values.
export function computeColorScale(
  values: number[],
  scaleName: string,
  mode = "q",
  numClasses = 10,
): ComputedColorScale | null {
  if (values.length === 0) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const limits = chroma.limits(values, mode as any, numClasses);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scale = chroma.scale(scaleName as any).classes(limits);

  return {
    limits,
    getColor: (value: number) => scale(value).hex(),
    getLegendColors: () => {
      const colors: string[] = [];
      for (let i = 0; i < limits.length - 1; i++) {
        const mid = (limits[i] + limits[i + 1]) / 2;
        colors.push(scale(mid).hex());
      }
      return colors;
    },
  };
}