import { Feature } from 'geojson';
import styles from './FeaturePopup.module.scss';

interface PopupField {
    key: string;
    label: string;
}

interface FeaturePopupProps {
    title: string;
    feature: Feature;
    fields: PopupField[];
    metricName?: string;
    metricValue?: number | null;
}

export function createPopupContent({
    title,
    feature,
    fields,
    metricName,
    metricValue
}: FeaturePopupProps): string {
    const properties = feature.properties || {};

    return `
    <div>
      <div class="${styles['popup-title']}">${escapeHtml(title)}</div>
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
            <span class="${styles['popup-field-value']}">${metricValue}</span>
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}