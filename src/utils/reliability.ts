export type ReliabilityTier = "reliable" | "usable" | "caution" | "severe" | "unreliable" | "neutral";

export interface Reliability {
  label: string;
  tier: ReliabilityTier;
}

export function getReliabilityLabel(
  absolute: number | null,
  marginOfError: number | null,
  cv: number | null,
  isCompleteCount: boolean,
): Reliability {
  if (isCompleteCount) return { label: "Complete count — no sampling error", tier: "neutral" };
  if (absolute === 0) return { label: "Too small to assess", tier: "neutral" };
  if (marginOfError == null || cv == null) return { label: "Reliability unknown", tier: "neutral" };
  if (cv <= 15) return { label: "Good — Relatively Reliable", tier: "reliable" };
  if (cv <= 30) return { label: "Fair — Use with Caution", tier: "usable" };
  if (cv <= 50) return { label: "High Uncertainty — Use with Substantial Caution", tier: "caution" };
  if (cv <= 61) return { label: "Very High Uncertainty — Carefully Assess Usability", tier: "severe" };
  return { label: "Unreliable — Consider Excluding", tier: "unreliable" };
}
