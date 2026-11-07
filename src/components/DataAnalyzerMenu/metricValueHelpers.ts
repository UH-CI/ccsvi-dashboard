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

// Percentages (stored 0–100) with one decimal, counts as whole numbers
export function formatValue(v: number, isPercentage: boolean): string {
  return isPercentage ? `${v.toFixed(1)}%` : v.toFixed(0);
}