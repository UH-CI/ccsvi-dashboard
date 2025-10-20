import React, { useMemo, useCallback } from 'react';
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
    Stack,
    Collapse,
    IconButton,
    Box,
    Chip
} from '@mui/material';
import {
    Camera,
    ExpandMore,
    ExpandLess,
    Layers,
    Visibility,
    VisibilityOff,
    Close,
} from '@mui/icons-material';
import * as FaIcons from 'react-icons/fa';
import {useAppStore, useMapStore, usePointLayerStore, usePrimaryMapState } from "../../types";
import { HazardLayerConfig } from "../../stores";
import { useUrlState } from '../../hooks/useUrlState';
import styles from './ControlPanel.module.scss';

interface IntegratedControlPanelProps {
    maxMaps: number;
interface ControlPanelProps {
    dataset: Dataset | null;
    activeDataset: string;
    activeDatasetMetric: string;
    onDatasetChange: (value: string) => void;
    onMetricChange: (value: string) => void;
    pointLayers: PointLayerConfig[];
    hazardLayers: HazardLayerConfig[];
    togglePointLayer: (id: string) => void;
    toggleHazardLayer: (id: string, isParent: boolean) => void;
    onTakeSnapshot: () => void;
}

export const ControlPanel: React.FC<IntegratedControlPanelProps> = ({
    maxMaps
}) => {
    // Get URL state (currently broken)
    const { urlState, updateUrlState } = useUrlState();

    const dataset = useAppStore(state => state.blockGroupData);

    const mapConfigs = useMapStore(state => state.mapConfigs);
    const addMap = useMapStore(state => state.addMap);
    const removeMap = useMapStore(state => state.removeMap);
    const updateMapConfig = useMapStore(state => state.updateMapConfig);
    const toggleMapVisibility = useMapStore(state => state.toggleMapVisibility);
    const expandedSections = useMapStore(state => state.expandedSections);
    const toggleSection = useMapStore(state => state.toggleSection);

    const { dataset: activeDataset, metric: activeDatasetMetric, setDataset, setMetric } = usePrimaryMapState();

    const pointLayerConfigs = usePointLayerStore(state => state.pointLayerConfigs);
    const visibleLayerIds = usePointLayerStore(state => state.visibleLayerIds);
    const toggleLayerVisibility = usePointLayerStore(state => state.toggleLayerVisibility);

    const pointLayers = useMemo(() =>
    pointLayerConfigs.map(config => ({
        ...config,
        visible: visibleLayerIds.has(config.id)
    })),
        [pointLayerConfigs, visibleLayerIds]
    );
export const ControlPanel: React.FC<ControlPanelProps> = ({
                                                              dataset,
                                                              activeDataset,
                                                              activeDatasetMetric,
                                                              onDatasetChange,
                                                              onMetricChange,
                                                              pointLayers,
                                                              hazardLayers,
                                                              togglePointLayer,
                                                              toggleHazardLayer,
                                                              onTakeSnapshot,
                                                          }) => {

    const datasetList = useMemo(() => {
        
        if (!dataset) return [];
        return Object.entries(dataset).map(([key, config]: [string, any]) => ({
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
        <Paper className={styles['integrated-control-panel']} elevation={2}>
            <Box className={styles['control-header']}>
                <Typography variant="h6" component="h2" className={styles['control-title']}>
                    Multi-Map Controls
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
                                    onChange={(event) => setMetric(event.target.value as string)}
                                
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

                        <Button
                            onClick={() => handleSnapshot()}
                            variant="contained"
                            startIcon={<Camera />}
                            fullWidth
                            size="small"
                        >
                            Take Snapshot
                        </Button>
                    </Stack>
                </Collapse>
            </Box>

            <Divider className={styles['section-divider']} />

            {/* Points of Interest Section */}
            <Box className={styles['control-section']}>
                <Box 
                    className={styles['section-header']}
                    onClick={() => toggleSection('points')}
                >
                    <Typography variant="subtitle1" className={styles['section-title']}>
                        Points of Interest
                    </Typography>
                    <IconButton size="small">
                        {expandedSections.points ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                </Box>

                <Stack spacing={1}>
                    {pointLayers.map(layer => {
                        const IconComponent = FaIcons[layer.icon as keyof typeof FaIcons] || FaIcons.FaCircle;

                            return (
                                <div key={layer.id} className={styles['layer-toggle']}>
                                    <FormControlLabel
                                        control={
                                            <Checkbox
                                                checked={layer.visible}
                                                onChange={() => handlePointLayerToggle(layer.id)}
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
                </Collapse>
            </Box>

            <Divider className={styles['section-divider']} />

            <div className={styles['geojson-section']}>
                <Typography variant="h6" className={styles['points-title']}>
                    Hazards
                </Typography>
                
                
                <Stack spacing={1}>
                    {hazardLayers.map((layer) => {
                        const IconComponent =
                        FaIcons[layer.icon as keyof typeof FaIcons] ||
                        FaIcons.FaExclamationTriangle;

                        return (
                        <div key={layer.id} className={styles["layer-toggle"]}>
                            {/* Parent Layer */}
                            <FormControlLabel
                            control={
                                <Checkbox
                                checked={layer.visible}
                                onChange={() => toggleHazardLayer(layer.id, true)}
                                size="small"
                                />
                            }
                            label={
                                <div className={styles["layer-label"]}>
                                <span
                                    className={styles["layer-icon"]}
                                    style={{ color: layer.color }}
                                >
                                    <IconComponent size="1rem" />
                                </span>
                                {layer.name}
                                </div>
                            }
                            />

                            {/* Children Layers */}
                            {/* {layer.children && (
                            <Stack spacing={1} sx={{ pl: 3 }}>
                                {layer.children.map((child) => {
                                const ChildIcon =
                                    FaIcons[child.icon as keyof typeof FaIcons] ||
                                    FaIcons.FaExclamationTriangle;

                                return (
                                    <FormControlLabel
                                    key={child.id}
                                    control={
                                        <Checkbox
                                        checked={child.visible}
                                        onChange={() => toggleHazardLayer(child.id, false)}
                                        size="small"
                                        />
                                    }
                                    label={
                                        <div className={styles["layer-label"]}>
                                        <span
                                            className={styles["layer-icon"]}
                                            style={{ color: child.color }}
                                        >
                                            <ChildIcon size="1rem" />
                                        </span>
                                        {child.name}
                                        </div>
                                    }
                                    />
                                );
                                })}
                            </Stack>
                            )} */}
                        </div>
                        );
                    })}
                </Stack>
            </div>


        </Paper>
    );
};

