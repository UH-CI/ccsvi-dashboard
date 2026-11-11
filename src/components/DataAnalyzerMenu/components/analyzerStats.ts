import { metricNumber } from "../../../api/queries/metricValues";
import type { SliderRange } from "../../../stores/useFilterStore";
import type { MetricKind, MetricValue } from "../../../types";
import { formatValue } from "../metricValueHelpers";

type MetricValues = Record<string, MetricValue> | null | undefined;

// How many bars the distribution chart has
const NUM_BINS = 20;

// Whether a value passes a slider: no range passes everything; an area with no value never passes a range
export function inRange(value: number | null, range: SliderRange): boolean {
  return range === null || (value !== null && value >= range[0] && value <= range[1]);
}

export function meanMedian(values: number[]): { mean: number; median: number } | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  return { mean, median };
}

// Every area's number for a metric, leaving out areas with none
export function metricNumbers(values: MetricValues, kind: MetricKind | undefined): number[] {
  if (!values || !kind) return [];
  return Object.values(values)
    .map((entry) => metricNumber(entry, kind))
    .filter((v): v is number => v !== null);
}

// The lowest and highest of some values; 0 to 1 when there are none
export function valueBounds(values: number[]): [number, number] {
  return values.length === 0 ? [0, 1] : [Math.min(...values), Math.max(...values)];
}

// The main metric's numbers for the areas the Filter keeps (all when none is applied) that pass both sliders
export function matchingValues(
  values: MetricValues,
  kind: MetricKind | undefined,
  values2: MetricValues,
  kind2: MetricKind | undefined,
  filteredGeoids: Set<string> | null,
  range: SliderRange,
  range2: SliderRange,
): number[] {
  if (!values || !kind) return [];
  return Object.entries(values)
    .filter(
      ([geoid]) =>
        (!filteredGeoids || filteredGeoids.has(geoid)) &&
        inRange(kind2 ? metricNumber(values2?.[geoid], kind2) : null, range2),
    )
    .map(([, entry]) => metricNumber(entry, kind))
    .filter((v): v is number => v !== null && inRange(v, range));
}

export interface Bin {
  label: string;
  start: number;
  end: number;
  count: number;
  matched: number;
  rest: number;
}

const binWidth = ([min, max]: [number, number]) => (max - min) / NUM_BINS || 1;

// Which of the bars a value falls in; the top value goes in the last bar
export function binIndex(value: number, bounds: [number, number]): number {
  return Math.min(Math.floor((value - bounds[0]) / binWidth(bounds)), NUM_BINS - 1);
}

// The values in equal-width bars from the lowest to the highest, each with how many of them match
export function binValues(
  values: number[],
  matched: number[],
  bounds: [number, number],
  kind: MetricKind,
): Bin[] {
  const step = binWidth(bounds);
  const bins = Array.from({ length: NUM_BINS }, (_, i) => ({
    label: formatValue(bounds[0] + i * step, kind),
    start: bounds[0] + i * step,
    end: bounds[0] + (i + 1) * step,
    count: 0,
    matched: 0,
    rest: 0,
  }));
  for (const v of values) bins[binIndex(v, bounds)].count++;
  for (const v of matched) bins[binIndex(v, bounds)].matched++;
  for (const bin of bins) bin.rest = bin.count - bin.matched;
  return bins;
}
