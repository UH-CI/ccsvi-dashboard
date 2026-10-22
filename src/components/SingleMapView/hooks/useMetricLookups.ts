import { useMemo } from "react";
import { MetricValue, Reliability } from "../../../types";

type MetricCache = Record<string, MetricValue>;

export interface MetricData {
  value: number | null;
  isPercentage: boolean;
  moePp: number | null;
  reliability: Reliability | null;
}

export interface MetricLookup {
  getData: (geoid: string) => MetricData;
}

export interface MetricLookups {
  allMetricValues: number[];
  metric1: MetricLookup;
  allMetricValues2: number[];
  metric2: MetricLookup | null;
}

const EMPTY_DATA: MetricData = { value: null, isPercentage: false, moePp: null, reliability: null };

function buildNumericLookup(cache: MetricCache, field: keyof MetricValue): Map<string, number> {
  const lookup = new Map<string, number>();
  for (const [geoid, entry] of Object.entries(cache)) {
    const raw = entry[field];
    if (raw == null) continue;
    const n = Number(raw);
    if (!isNaN(n)) lookup.set(geoid, n);
  }
  return lookup;
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
      metric1: { getData: () => EMPTY_DATA },
      allMetricValues2: [],
      metric2: null,
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

    const buildMetricLookup = (cache: MetricCache): { lookup: MetricLookup; values: number[] } => {
      const value = new Map<string, number>();
      const values: number[] = [];
      for (const [geoid, entry] of Object.entries(cache)) {
        const v = pickValue(entry);
        if (v !== null) {
          value.set(geoid, v);
          values.push(v);
        }
      }

      const moePp = buildNumericLookup(cache, "moe_percentage_points");

      return {
        values,
        lookup: {
          getData: (geoid: string): MetricData => ({
            value: value.get(geoid) ?? null,
            isPercentage: cache[geoid]?.percentage != null,
            moePp: moePp.get(geoid) ?? null,
            reliability: cache[geoid]?.reliability ?? null,
          }),
        },
      };
    };

    const { lookup: metric1Lookup, values: values1 } = buildMetricLookup(cachedMetric1);
    const metric2Result = metric2 && cachedMetric2 ? buildMetricLookup(cachedMetric2) : null;

    return {
      allMetricValues: values1,
      metric1: metric1Lookup,
      allMetricValues2: metric2Result?.values ?? [],
      metric2: metric2Result?.lookup ?? null,
    };
  }, [cachedMetric1, cachedMetric2, metric1, metric2]);
}
