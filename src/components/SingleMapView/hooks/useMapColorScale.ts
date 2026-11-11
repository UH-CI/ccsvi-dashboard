import { useMemo } from "react";
import {
  computeColorScale,
  computeBivariateColorScale,
  ComputedColorScale,
  ComputedBivariateColorScale,
} from "../../../utils/colorThresholds";

interface UseMapColorScaleArgs {
  allMetricValues: number[];
  allMetricValues2: number[];
  colorScheme: string;
  bivariateColorScheme: string;
  hasSecondMetric: boolean;
  // Whether the map has an indicator
  hasMetric: boolean;
  isCount: boolean;
  // The fill for an area with no value: the map's hatch
  noValueFill: string;
}

interface MapColorScale {
  colorScale: ComputedColorScale | null;
  bivariateColorScale: ComputedBivariateColorScale | null;
  getColor: (value1: number | null, value2?: number | null) => string;
}

// Derives the univariate/bivariate color scales and a getColor resolver.
export function useMapColorScale({
  allMetricValues,
  allMetricValues2,
  colorScheme,
  bivariateColorScheme,
  hasSecondMetric,
  hasMetric,
  isCount,
  noValueFill,
}: UseMapColorScaleArgs): MapColorScale {
  const colorScale = useMemo(() => {
    if (!hasMetric) return null;
    return computeColorScale(allMetricValues, colorScheme, isCount);
  }, [allMetricValues, colorScheme, hasMetric, isCount]);

  const bivariateColorScale = useMemo(() => {
    if (!hasSecondMetric || allMetricValues2.length === 0) return null;
    return computeBivariateColorScale(allMetricValues, allMetricValues2, bivariateColorScheme);
  }, [allMetricValues, allMetricValues2, bivariateColorScheme, hasSecondMetric]);

  const getColor = useMemo(() => {
    if (bivariateColorScale) {
      return (value1: number | null, value2?: number | null): string =>
        value1 === null || value2 == null
          ? noValueFill
          : bivariateColorScale.getColor(value1, value2);
    }
    return (value: number | null): string => {
      if (value === null || !colorScale) return noValueFill;
      return colorScale.getColor(value);
    };
  }, [colorScale, bivariateColorScale, noValueFill]);

  return { colorScale, bivariateColorScale, getColor };
}
