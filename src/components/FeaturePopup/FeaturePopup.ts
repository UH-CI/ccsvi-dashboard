import { Feature } from 'geojson';
import styles from './FeaturePopup.module.scss';

interface PopupField {
    key: string;
    label: string;
}

interface FeaturePopupProps {
    // title: string;
    metadata?: string[];
    feature: Feature;
    fields: PopupField[];
    metricName?: string;
    metricValue?: number | null;
}

export function FeaturePopup({
    // title
                                 metadata,
    feature,
    fields,
    metricName,
    metricValue
}: FeaturePopupProps): string {
    const properties = feature.properties || {};

    return `
    <div>
      ${metadata && metadata.length > 0 ? `
        <div class="${styles['popup-metadata']}">
          ${metadata.map(line => `<div class="${styles['popup-metadata-line']}">${escapeHtml(line)}</div>`).join('')}
        </div>
      ` : ''}
      <div class="${styles['popup-fields']}">
        ${fields.map(field => {
        const value = properties[field.key];
        const displayValue = value ?? 'N/A';
        return `
            <div class="${styles['popup-field']}">
              <span class="${styles['popup-field-label']}">${escapeHtml(field.label)}:</span>
              <span class="${styles['popup-field-value']}">${escapeHtml(String(displayValue))}</span>
            </div>
          `;
    }).join('')}
        ${metricName && metricValue !== null && metricValue !== undefined ? `
          <div class="${styles['popup-field']}">
            <span class="${styles['popup-field-label']}">${escapeHtml(metricName)}:</span>
            <span class="${styles['popup-field-value-group']}">
              <span class="${styles['popup-field-value']}">${metricValue.toFixed(2)}</span>
              <span class="${styles['popup-metric-subheader']}">(Per Capita)</span>
            </span>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

// Escape HTML to prevent XSS
function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}