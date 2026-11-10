import { useMemo } from "react";
import { metricNumber } from "../../../api/queries/metricValues";
import { MetricKind, MetricValue, Reliability } from "../../../types";

type MetricCache = Record<string, MetricValue>;

export interface MetricData {
  value: number | null;
  moePp: number | null;
  reliability: Reliability | null;
}

// One metric's values by area, and whether it's shown as a percentage or a count
export interface MetricLookup {
  kind: MetricKind;
  getData: (geoid: string) => MetricData;
}

export interface MetricLookups {
  allMetricValues: number[];
  metric1: MetricLookup;
  allMetricValues2: number[];
  metric2: MetricLookup | null;
}

const EMPTY_DATA: MetricData = { value: null, moePp: null, reliability: null };

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

// Each metric's number by area (percentage or count, by its kind); an area without one has no value and no colour band
export function useMetricLookups(
  cachedMetric1: MetricCache | undefined,
  cachedMetric2: MetricCache | undefined,
  kind1: MetricKind | undefined,
  kind2: MetricKind | undefined,
): MetricLookups {
  return useMemo(() => {
    const noData: MetricLookups = {
      allMetricValues: [],
      metric1: { kind: "count", getData: () => EMPTY_DATA },
      allMetricValues2: [],
      metric2: null,
    };

    if (!cachedMetric1 || !kind1) return noData;

    const buildMetricLookup = (
      cache: MetricCache,
      kind: MetricKind,
    ): { lookup: MetricLookup; values: number[] } => {
      const value = new Map<string, number>();
      for (const [geoid, entry] of Object.entries(cache)) {
        const v = metricNumber(entry, kind);
        if (v !== null) value.set(geoid, v);
      }

      const moePp = buildNumericLookup(cache, "moe_percentage_points");

      return {
        values: [...value.values()],
        lookup: {
          kind,
          getData: (geoid: string): MetricData => ({
            value: value.get(geoid) ?? null,
            moePp: moePp.get(geoid) ?? null,
            reliability: cache[geoid]?.reliability ?? null,
          }),
        },
      };
    };

    const { lookup: metric1Lookup, values: values1 } = buildMetricLookup(cachedMetric1, kind1);
    const metric2Result = kind2 && cachedMetric2 ? buildMetricLookup(cachedMetric2, kind2) : null;

    return {
      allMetricValues: values1,
      metric1: metric1Lookup,
      allMetricValues2: metric2Result?.values ?? [],
      metric2: metric2Result?.lookup ?? null,
    };
  }, [cachedMetric1, cachedMetric2, kind1, kind2]);
}
