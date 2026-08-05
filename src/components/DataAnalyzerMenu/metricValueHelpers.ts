import { MetricValue } from "../../types";

export function pickValue(entry: MetricValue | undefined): number | null {
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
}

export function formatValue(v: number, isPercentage: boolean, maxVal?: number): string {
  if (!isPercentage) return v.toFixed(0);
  // If max value is already > 1 the backend stored percentages in 0–100 form
  const alreadyScaled = maxVal != null && maxVal > 1;
  return alreadyScaled ? `${v.toFixed(1)}%` : `${(v * 100).toFixed(1)}%`;
}