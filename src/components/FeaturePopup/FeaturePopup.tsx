import React from 'react';
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
    additionalContent?: React.ReactNode;
}

export const FeaturePopup: React.FC<FeaturePopupProps> = ({
                                                                            title,
                                                                            feature,
                                                                            fields,
                                                                            metricName,
                                                                            metricValue,
                                                                            additionalContent
                                                                        }) => {
    const properties = feature.properties || {};

    return (
        <div>
            <div className={styles['popup-title']}>{title}</div>

            <div className={styles['popup-fields']}>
                {fields.map(field => {
                    const value = properties[field.key];
                    const displayValue = value ?? 'N/A';

                    return (
                        <div key={field.key} className={styles['popup-field']}>
                            <span className={styles['popup-field-label']}>{field.label}:</span>
                            <span className={styles['popup-field-value']}>{String(displayValue)}</span>
                        </div>
                    );
                })}

                {metricName && metricValue !== null && metricValue !== undefined && (
                    <div className={styles['popup-field']}>
                        <span className={styles['popup-field-label']}>{metricName}:</span>
                        <span className={styles['popup-field-value']}>{metricValue}</span>
                    </div>
                )}
            </div>

            {additionalContent && (
                <div className={styles['popup-additional']}>
                    {additionalContent}
                </div>
            )}
        </div>
    );
};