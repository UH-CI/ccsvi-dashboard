import type { MetricKind } from "../../types";

// Percentages (stored 0–100) with one decimal, counts as whole numbers
export function formatValue(v: number, kind: MetricKind): string {
  return kind === "percentage" ? `${v.toFixed(1)}%` : v.toFixed(0);
}