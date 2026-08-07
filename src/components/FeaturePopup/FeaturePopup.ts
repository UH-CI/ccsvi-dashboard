import { Feature } from "geojson";
import styles from "./FeaturePopup.module.scss";

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

interface FeaturePopupProps {
  // title: string;
  metadata?: string[];
  feature: Feature;
  fields: PopupField[];
  metricName?: string;
  metricValue?: number | null;
  metricMoE?: number | null;
  metricName2?: string;
  metricValue2?: number | null;
  metricMoE2?: number | null;
  hcdp?: HcdpPopupField;
  overlay?: OverlayPopupField;
}

export function FeaturePopup({
  // title
  metadata,
  feature,
  fields,
  metricName,
  metricValue,
  metricMoE,
  metricName2,
  metricValue2,
  metricMoE2,
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
        ${
          metricName && metricValue !== null && metricValue !== undefined
            ? `
          <div class="${styles["popup-field"]}">
            <span class="${styles["popup-field-label"]}">${escapeHtml(metricName)}:</span>
            <span class="${styles["popup-field-value-group"]}">
              <span class="${styles["popup-field-value"]}">${metricValue.toFixed(2)}%${metricMoE !== null && metricMoE !== undefined ? ` ± ${metricMoE} (MoE)` : ""}</span>
            </span>
          </div>
        `
            : ""
        }
        ${
          metricName2 && metricValue2 !== null && metricValue2 !== undefined
            ? `
          <div class="${styles["popup-field"]}">
            <span class="${styles["popup-field-label"]}">${escapeHtml(metricName2)}:</span>
            <span class="${styles["popup-field-value-group"]}">
              <span class="${styles["popup-field-value"]}">${metricValue2.toFixed(2)}%${metricMoE2 !== null && metricMoE2 !== undefined ? ` ± ${metricMoE2} (MoE)` : ""}</span>
            </span>
          </div>
        `
            : ""
        }
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
