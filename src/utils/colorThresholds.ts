import chroma from "chroma-js";

export interface ComputedColorScale {
  limits: number[];
  getColor: (value: number) => string;
  getLegendColors: () => string[];
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