import chroma from "chroma-js";
import {
  BIVARIATE_SCHEMES,
  COLOR_SCHEMES,
  DEFAULT_BIVARIATE_SCHEME,
  NO_VALUE_COLOR,
} from "../config";

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

// Builds a 3×3 bivariate color scale from two sets of raw values. An unknown palette name (e.g. from an edited link) uses the default.
export function computeBivariateColorScale(
  values1: number[],
  values2: number[],
  paletteName: string,
): ComputedBivariateColorScale | null {
  if (values1.length === 0 || values2.length === 0) return null;

  const scheme =
    BIVARIATE_SCHEMES.find(({ name }) => name === paletteName) ??
    BIVARIATE_SCHEMES.find(({ name }) => name === DEFAULT_BIVARIATE_SCHEME)!;
  const palette = scheme.palette;
  const numClasses = palette.length; // 3

  // Quantile breaks: each class holds about the same number of areas
  const limits1 = chroma.limits(values1, "q", numClasses);
  const limits2 = chroma.limits(values2, "q", numClasses);

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
      if (value1 === null || value2 === null) return NO_VALUE_COLOR;
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
  isCount = false,
  numClasses = 10,
): ComputedColorScale | null {
  if (values.length === 0) return null;

  // Quantile breaks: each class holds about the same number of areas
  let rawLimits: number[];
  if (isCount) {
    // Mostly-0 counts would fill most bins with 0s, so 0 gets its own bin and
    // only the non-zero values are split into the rest.
    rawLimits = [0, ...chroma.limits(values.filter((v) => v !== 0), "q", numClasses - 1)];
  } else {
    rawLimits = chroma.limits(values, "q", numClasses);
  }
  // Skewed data (e.g. mostly zeros) can produce repeated quantile cut
  // points; collapse those so the legend doesn't show empty bins.
  const limits = rawLimits.filter((limit, i) => i === 0 || limit !== rawLimits[i - 1]);
  const scheme = COLOR_SCHEMES.find(({ name }) => name === scaleName);
  const colors = scheme?.flip ? [...chroma.brewer[scheme.name]].reverse() : null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scale = (colors ? chroma.scale(colors) : chroma.scale(scaleName as any)).classes(limits);
  const legendColors = Array.from({ length: limits.length - 1 }, (_, index) => {
    const mid = (limits[index] + limits[index + 1]) / 2;
    return scale(mid).hex();
  });

  return {
    limits,
    getColor: (value: number) => scale(value).hex(),
    getLegendColors: () => [...legendColors],
  };
}