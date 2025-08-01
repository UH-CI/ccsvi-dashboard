import React, { useMemo } from 'react';
import {
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Button,
    FormControlLabel,
    Checkbox,
    Paper,
    Divider,
    Stack
} from '@mui/material';
import { Camera } from '@mui/icons-material';
import * as FaIcons from 'react-icons/fa';
import { Dataset } from '../../types';
import { PointLayerConfig} from "../../types";
import styles from './ControlPanel.module.scss';

interface ControlPanelProps {
    dataset: Dataset | null;
    activeDataset: string;
    activeDatasetMetric: string;
    onDatasetChange: (value: string) => void;
    onMetricChange: (value: string) => void;
    pointLayers: PointLayerConfig[];
    togglePointLayer: (id: string) => void;
    onTakeSnapshot: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
                                                              dataset,
                                                              activeDataset,
                                                              activeDatasetMetric,
                                                              onDatasetChange,
                                                              onMetricChange,
                                                              pointLayers,
                                                              togglePointLayer,
                                                              onTakeSnapshot,
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
        <Paper className={styles['control-panel']} elevation={2}>
            <Typography variant="h5" component="h2" className={styles['control-title']}>
                Controls
            </Typography>

            <div className={styles['vulnerability-section']}>
                <Typography variant="subtitle1" className={styles['section-title']}>
                    Vulnerability Indicators
                </Typography>

                <Stack spacing={2}>
                    <FormControl fullWidth size="small">
                        <InputLabel>Dataset</InputLabel>
                        <Select
                            value={activeDataset}
                            label="Dataset"
                            onChange={(event) => onDatasetChange(event.target.value as string)}
                            className={styles['mui-select']}
                        >
                            <MenuItem value="">
                                <em>Select Dataset</em>
                            </MenuItem>
                            {datasetList.map(dataset => (
                                <MenuItem key={dataset.id} value={dataset.id}>
                                    {dataset.label}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {activeDataset && (
                        <FormControl fullWidth size="small">
                            <InputLabel>Metric</InputLabel>
                            <Select
                                value={activeDatasetMetric}
                                label="Metric"
                                onChange={(event) => onMetricChange(event.target.value as string)}
                                className={styles['mui-select']}
                            >
                                <MenuItem value="">
                                    <em>Select Metric</em>
                                </MenuItem>
                                {datasetMetrics.map(metric => (
                                    <MenuItem key={metric.id} value={metric.id}>
                                        {metric.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}
                </Stack>
            </div>

            <Divider className={styles['section-divider']} />

            <div className={styles['snapshot-section']}>
                <Button
                    onClick={onTakeSnapshot}
                    variant="contained"
                    startIcon={<Camera />}
                    fullWidth
                    aria-label="Take a snapshot of the current map view"
                    className={styles['snapshot-button']}
                >
                    Take Snapshot
                </Button>
            </div>

            <Divider className={styles['section-divider']} />

            <div className={styles['points-section']}>
                <Typography variant="h6" className={styles['points-title']}>
                    Points of Interest
                </Typography>

                <Stack spacing={1}>
                    {pointLayers.map(layer => {
                        const IconComponent = FaIcons[layer.icon as keyof typeof FaIcons] || FaIcons.FaCircle;

                        return (
                            <div key={layer.id} className={styles['layer-toggle']}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={layer.visible}
                                            onChange={() => togglePointLayer(layer.id)}
                                            size="small"
                                        />
                                    }
                                    label={
                                        <div className={styles['layer-label']}>
                                            <span
                                                className={styles['layer-icon']}
                                                style={{ color: layer.color }}
                                            >
                                                <IconComponent size="1rem" />
                                            </span>
                                            {layer.name}
                                        </div>
                                    }
                                />
                            </div>
                        );
                    })}
                </Stack>
            </div>
        </Paper>
    );
};