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
  value?: number | null;
  loading?: boolean;
}

export interface OverlayPopupField {
  label: string;
  value?: number | null;
  loading?: boolean;
  suffix?: string;
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
}

function renderMetricField(metric: MetricDisplay): string {
  return `
    <div class="${styles["popup-field"]}">
      <span class="${styles["popup-field-label"]}">${escapeHtml(metric.name)}:</span>
      <span class="${styles["popup-field-value-group"]}">
        <span class="${styles["popup-field-value"]}">${metric.value.toFixed(1)}%${metric.moePp !== null ? ` ± ${metric.moePp} pp` : ""}</span>
        ${
          metric.reliability
            ? `<span class="${styles["popup-reliability"]} ${RELIABILITY_TIER_CLASS[metric.reliability.tier]}">${escapeHtml(metric.reliability.label)}</span>`
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
        ${
          hcdp
            ? `
          <div class="${styles["popup-field"]}">
            <span class="${styles["popup-field-label"]}">${escapeHtml(hcdp.label)} (mean):</span>
            <span class="${styles["popup-field-value"]}">${
              hcdp.loading
                ? "Calculating…"
                : hcdp.value != null
                  ? hcdp.value.toFixed(2)
                  : "N/A"
            }</span>
          </div>
        `
            : ""
        }
        ${
          overlay
            ? `
          <div class="${styles["popup-field"]}">
            <span class="${styles["popup-field-label"]}">${escapeHtml(overlay.label)}:</span>
            <span class="${styles["popup-field-value"]}">${
              overlay.loading
                ? "Calculating…"
                : overlay.value != null
                  ? `${overlay.value.toFixed(2)}${overlay.suffix ?? ""}`
                  : "N/A"
            }</span>
          </div>
        `
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
