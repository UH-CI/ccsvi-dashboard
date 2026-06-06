import { useMemo } from "react";
import {
  computeColorScale,
  computeBivariateColorScale,
  ComputedColorScale,
  ComputedBivariateColorScale,
} from "../../../utils/colorThresholds";
import { MetricConfig } from "../../../types";

interface UseMapColorScaleArgs {
  allMetricValues: number[];
  allMetricValues2: number[];
  colorScheme: string;
  bivariateColorScheme: string;
  hasSecondMetric: boolean;
  datasetMetricObject: MetricConfig | null;
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
  datasetMetricObject,
}: UseMapColorScaleArgs): MapColorScale {
  const colorScale = useMemo(() => {
    if (!datasetMetricObject) return null;
    return computeColorScale(
      allMetricValues,
      colorScheme,
      datasetMetricObject.classificationMode ?? "q",
    );
  }, [allMetricValues, colorScheme, datasetMetricObject]);

  const bivariateColorScale = useMemo(() => {
    if (!hasSecondMetric || allMetricValues2.length === 0) return null;
    return computeBivariateColorScale(
      allMetricValues,
      allMetricValues2,
      bivariateColorScheme,
      datasetMetricObject?.classificationMode ?? "q",
    );
  }, [
    allMetricValues,
    allMetricValues2,
    bivariateColorScheme,
    datasetMetricObject,
    hasSecondMetric,
  ]);

  const getColor = useMemo(() => {
    if (bivariateColorScale) {
      return (value1: number | null, value2?: number | null): string =>
        bivariateColorScale.getColor(value1, value2 ?? null);
    }
    return (value: number | null): string => {
      if (value === null || !colorScale) return "#cccccc";
      return colorScale.getColor(value);
    };
  }, [colorScale, bivariateColorScale]);

  return { colorScale, bivariateColorScale, getColor };
}
