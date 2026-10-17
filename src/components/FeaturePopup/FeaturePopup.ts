import { Feature } from "geojson";
import styles from "./FeaturePopup.module.scss";
import type { Reliability, ReliabilityTier } from "../../utils/reliability";

const RELIABILITY_TIER_CLASS: Record<ReliabilityTier, string> = {
  reliable: styles["popup-reliability-reliable"],
  usable: styles["popup-reliability-usable"],
  caution: styles["popup-reliability-caution"],
  severe: styles["popup-reliability-severe"],
  unreliable: styles["popup-reliability-unreliable"],
  neutral: "",
};

interface PopupField {
  key: string;
  label: string;
}

export interface HcdpPopupField {
  label: string;
  meanValue?: number | null;
  maxValue?: number | null;
  loading?: boolean;
}

export interface OverlayPopupField {
  label: string;
  meanValue?: number | null;
  maxValue?: number | null;
  loading?: boolean;
  suffix?: string;
}

export interface PointCountsPopupField {
  loading?: boolean;
  items: { label: string; value: number; iconHtml?: string }[]; // pre-filtered to nonzero counts
}

export interface MetricDisplay {
  name: string;
  value: number;
  moePp: number | null;
  reliability: Reliability | null;
}

interface FeaturePopupProps {
  // title: string;
  metadata?: string[];
  feature: Feature;
  fields: PopupField[];
  metric1?: MetricDisplay;
  metric2?: MetricDisplay;
  hcdp?: HcdpPopupField;
  overlay?: OverlayPopupField;
  pointCounts?: PointCountsPopupField;
}

function renderRasterStats(field: HcdpPopupField | OverlayPopupField): string {
  const suffix = "suffix" in field ? (field.suffix ?? "") : "";
  const row = (name: string, text: string) => `
    <div class="${styles["popup-field"]}">
      <span class="${styles["popup-field-label"]}">${escapeHtml(field.label)}${name}:</span>
      <span class="${styles["popup-field-value"]}">${text}</span>
    </div>
  `;
  const show = (value: number | null | undefined) =>
    value != null ? `${value.toFixed(2)}${suffix}` : "N/A";
  return field.loading
    ? row("", "Calculating…")
    : row(" (mean)", show(field.meanValue)) + row(" (max)", show(field.maxValue));
}

function renderMetricField(metric: MetricDisplay): string {
  return `
    <div class="${styles["popup-field"]}">
      <span class="${styles["popup-field-label"]}">${escapeHtml(metric.name)}:</span>
      <span class="${styles["popup-field-value-group"]}">
        <span class="${styles["popup-field-value"]}">${metric.value.toFixed(1)}%${metric.moePp !== null ? ` ± ${metric.moePp} pp` : ""}</span>
        ${
          metric.reliability
            ? `<span class="${styles["popup-reliability"]} ${RELIABILITY_TIER_CLASS[metric.reliability.tier]}">Data Reliability: ${escapeHtml(metric.reliability.label)}</span>`
            : ""
        }
      </span>
    </div>
  `;
}

export function FeaturePopup({
  // title
  metadata,
  feature,
  fields,
  metric1,
  metric2,
  hcdp,
  overlay,
  pointCounts,
}: FeaturePopupProps): string {
  const properties = feature.properties || {};

  return `
    <div>
      ${
        metadata && metadata.length > 0
          ? `
        <div class="${styles["popup-metadata"]}">
          ${metadata.map((line) => `<div class="${styles["popup-metadata-line"]}">${escapeHtml(line)}</div>`).join("")}
          
        </div>
      `
          : ""
      }
      <div class="${styles["popup-fields"]}">
        ${fields
          .map((field) => {
            const value = properties[field.key];
            const displayValue = value ?? "N/A";
            return `
            <div class="${styles["popup-field"]}">
              <span class="${styles["popup-field-label"]}">${escapeHtml(field.label)}:</span>
              <span class="${styles["popup-field-value"]}">${escapeHtml(String(displayValue))}</span>
            </div>
          `;
          })
          .join("")}
        ${metric1 ? renderMetricField(metric1) : ""}
        ${metric2 ? renderMetricField(metric2) : ""}
        ${hcdp ? renderRasterStats(hcdp) : ""}
        ${overlay ? renderRasterStats(overlay) : ""}
        ${
          pointCounts
            ? pointCounts.loading
              ? `
          <div class="${styles["popup-field"]}">
            <span class="${styles["popup-field-label"]}">Nearby:</span>
            <span class="${styles["popup-field-value"]}">Calculating…</span>
          </div>
        `
              : pointCounts.items
                  .map(
                    (item) => `
          <div class="${styles["popup-field"]}">
            <span class="${styles["popup-field-label"]}">${escapeHtml(item.label)}:</span>
            <span class="${styles["popup-field-value"]}">${item.value}${item.iconHtml ?? ""}</span>
          </div>
        `,
                  )
                  .join("")
            : ""
        }
      </div>
    </div>
  `;
}

// Escape HTML to prevent XSS
function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
