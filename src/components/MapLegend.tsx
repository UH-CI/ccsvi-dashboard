import React, { useMemo } from 'react';
import { Dataset } from '../types';
import styles from '../App.module.scss';

interface MapLegendProps {
    dataset: Dataset | null;
    activeDataset: string;
    activeDatasetMetric: string;
}

export const MapLegend: React.FC<MapLegendProps> = ({
                                                        dataset,
                                                        activeDataset,
                                                        activeDatasetMetric
                                                    }) => {
    const activeDatasetMetricObject = useMemo(() => {
        if (!dataset || !activeDataset || !activeDatasetMetric) return null;
        return dataset[activeDataset]?.columnThresholds?.[activeDatasetMetric];
    }, [dataset, activeDataset, activeDatasetMetric]);

    const legendLevels = useMemo(() => {
        if (!activeDatasetMetricObject) return [];

        const items = [];
        for (let i = activeDatasetMetricObject.thresholds.length - 1; i >= 0; i--) {
            const low = activeDatasetMetricObject.thresholds[i];
            const high = activeDatasetMetricObject.thresholds[i + 1];

            let label;
            if (i === activeDatasetMetricObject.thresholds.length - 1) {
                label = `> ${low}`;
            } else if (i === 0) {
                label = `${low}`;
            } else {
                label = `${low}-${high - 1}`;
            }

            items.push(
                <div key={i} className={styles.legend__item}>
                    <div
                        className={styles['legend__item-color']}
                        style={{ backgroundColor: activeDatasetMetricObject.colors[i] }}
                    ></div>
                    <span>{label}</span>
                </div>
            );
        }
        return items;
    }, [activeDatasetMetricObject]);

    if (!dataset || !activeDataset || !activeDatasetMetric) {
        return null;
    }

    return (
        <div className={styles.legend}>
            <div className={styles.legend__items}>
                {legendLevels}
            </div>
        </div>
    );
};