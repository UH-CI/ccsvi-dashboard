import React, { useMemo } from 'react';
import * as FaIcons from 'react-icons/fa';
import { Dataset } from '../types';
import { PointLayerConfig } from './PointLayers';
import styles from '../App.module.scss';

interface ControlPanelProps {
    dataset: Dataset | null;
    activeDataset: string;
    activeDatasetMetric: string;
    onDatasetChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    onMetricChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

interface ControlPanelProps {
    dataset: Dataset | null;
    activeDataset: string;
    activeDatasetMetric: string;
    onDatasetChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    onMetricChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    pointLayers: PointLayerConfig[];
    togglePointLayer: (id: string) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
                                                              dataset,
                                                              activeDataset,
                                                              activeDatasetMetric,
                                                              onDatasetChange,
                                                              onMetricChange,
                                                              pointLayers,
                                                              togglePointLayer
                                                          }) => {

    const datasetList = useMemo(() => {
        if (!dataset) return [];
        return Object.entries(dataset).map(([key, config]) => ({
            id: key,
            label: config.metricLabel || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            hawaiianHomelands: config.hawaiianHomelands || false
        }));
    }, [dataset]);

    const datasetMetrics = useMemo(() => {
        if (!dataset || !activeDataset) return [];
        const datasetObject = dataset[activeDataset];
        if (!datasetObject?.columnThresholds) return [];
        return Object.keys(datasetObject.columnThresholds).map(columnName => ({
            id: columnName,
            label: columnName
        }));
    }, [dataset, activeDataset]);

    return (
        <div className={styles['control-panel']}>
            <h2>Controls</h2>
            <div>
                <select
                    value={activeDataset}
                    onChange={onDatasetChange}
                    style={{ padding: '5px' }}
                >
                    <option value="">Select Dataset </option>
                    {datasetList.map(dataset => (
                        <option key={dataset.id} value={dataset.id}>
                            {dataset.label}
                        </option>
                    ))}
                </select>
            </div>
            {activeDataset && (
                <div>
                    <select
                        value={activeDatasetMetric}
                        onChange={onMetricChange}
                        style={{ padding: '5px' }}
                    >
                        <option value="">Select Metric</option>
                        {datasetMetrics.map(metric => (
                            <option key={metric.id} value={metric.id}>
                                {metric.label}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            <div>
                <h3>Points of Interest</h3>
                {pointLayers.map(layer => {
                    const IconComponent = FaIcons[layer.icon as keyof typeof FaIcons] || FaIcons.FaCircle;

                    return (
                        <div key={layer.id} className={styles['layer-toggle']}>
                            <label>
                                <input
                                    type="checkbox"
                                    checked={layer.visible}
                                    onChange={() => togglePointLayer(layer.id)}
                                />
                                <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    width: '16px',
                                    height: '16px',
                                    marginRight: '8px',
                                    color: layer.color
                                }}>
                                    <IconComponent size={12} />
                                </span>
                                {layer.name}
                            </label>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};