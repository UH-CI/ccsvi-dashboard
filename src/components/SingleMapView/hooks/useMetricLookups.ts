import { useMemo } from "react";
import { MetricValue } from "../../../types";

type MetricCache = Record<string, MetricValue>;

export interface MetricLookups {
  allMetricValues: number[];
  getMetricValue: (geoid: string) => number | null;
  getMetricMoE: ((geoid: string) => number | null) | null;
  allMetricValues2: number[];
  getMetricValue2: ((geoid: string) => number | null) | null;
  getMetricMoE2: ((geoid: string) => number | null) | null;
}

export function useMetricLookups(
  cachedMetric1: MetricCache | null,
  cachedMetric2: MetricCache | null,
  metric1?: string,
  metric2?: string,
): MetricLookups {
  return useMemo(() => {
    const noData: MetricLookups = {
      allMetricValues: [],
      getMetricValue: () => null,
      getMetricMoE: null,
      allMetricValues2: [],
      getMetricValue2: null,
      getMetricMoE2: null,
    };

    if (!cachedMetric1 || !metric1) return noData;

    // Use percentage when available; fall back to absolute values
    const pickValue = (entry: MetricValue | undefined): number | null => {
      if (!entry) return null;
      if (entry.percentage != null) {
        const n = Number(entry.percentage);
        if (!isNaN(n)) return n;
      }
      if (entry.absolute != null) {
        const n = Number(entry.absolute);
        if (!isNaN(n)) return n;
      }
      return null;
    };

    const lookup1 = new Map<string, number>();
    const lookupMoE1 = new Map<string, number>();
    const lookup2 = metric2 && cachedMetric2 ? new Map<string, number>() : null;
    const lookupMoE2 = metric2 && cachedMetric2 ? new Map<string, number>() : null;
    const values1: number[] = [];
    const values2: number[] = [];

    for (const [geoid, values] of Object.entries(cachedMetric1)) {
      const v1 = pickValue(values);
      if (v1 !== null) {
        lookup1.set(geoid, v1);
        values1.push(v1);
      }
      const moe1 = values.margin_of_error != null ? Number(values.margin_of_error) : null;
      if (moe1 !== null && !isNaN(moe1)) lookupMoE1.set(geoid, moe1);

      if (lookup2 && lookupMoE2 && cachedMetric2) {
        const v2 = pickValue(cachedMetric2[geoid]);
        if (v2 !== null) {
          lookup2.set(geoid, v2);
          values2.push(v2);
        }
        const moe2 =
          cachedMetric2[geoid]?.margin_of_error != null
            ? Number(cachedMetric2[geoid].margin_of_error)
            : null;
        if (moe2 !== null && !isNaN(moe2)) lookupMoE2.set(geoid, moe2);
      }
    }

    return {
      allMetricValues: values1,
      getMetricValue: (geoid: string): number | null => lookup1.get(geoid) ?? null,
      getMetricMoE: (geoid: string): number | null => lookupMoE1.get(geoid) ?? null,
      allMetricValues2: values2,
      getMetricValue2: lookup2
        ? (geoid: string): number | null => lookup2.get(geoid) ?? null
        : null,
      getMetricMoE2: lookupMoE2
        ? (geoid: string): number | null => lookupMoE2.get(geoid) ?? null
        : null,
    };
  }, [cachedMetric1, cachedMetric2, metric1, metric2]);
}
