import React, { useMemo, useState } from 'react';
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
} from '@mui/icons-material';
import * as FaIcons from 'react-icons/fa';
import { Dataset, PointLayerConfig, MapConfig, HazardLayerConfig } from '../../types';
import { HazardLayerWithSubs } from '../../hooks/useHazardLayers';
import styles from './ControlPanel.module.scss';

interface IntegratedControlPanelProps {
    dataset: Dataset | null;
    mapConfigs: MapConfig[];
    activeDataset: string;
    activeDatasetMetric: string;
    onDatasetChange: (value: string) => void;
    onMetricChange: (value: string) => void;
    pointLayers: PointLayerConfig[];
    togglePointLayer: (id: string) => void;

    hazardLayers?: HazardLayerWithSubs[];
    toggleHazardLayer?: (id: string, isParent?: boolean) => void;

    onAddMap: () => void;
    onRemoveMap: (mapId: string) => void;
    onUpdateMapConfig: (mapId: string, updates: Partial<MapConfig>) => void;
    onToggleVisibility: (mapId: string) => void;
    maxMaps: number;
}

export const MultiMapControlPanel: React.FC<IntegratedControlPanelProps> = ({
    dataset,
    mapConfigs,
    activeDataset,
    activeDatasetMetric,
    onDatasetChange,
    onMetricChange,
    pointLayers,
    togglePointLayer,

    hazardLayers = [],
    toggleHazardLayer,

    onAddMap,
    onRemoveMap,
    onUpdateMapConfig,
    onToggleVisibility,
    maxMaps
}) => {
    const [expandedSections, setExpandedSections] = useState({
        maps: true,
        vulnerability: true,
        points: true,
        hazards: true
    });

    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

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

    const visibleMaps = mapConfigs.filter(config => config.visible);
    const canAddMap = mapConfigs.length < maxMaps;
    const canRemoveMap = mapConfigs.length > 1;

    return (
        <Paper className={styles['integrated-control-panel']} elevation={2}>
            <Box className={styles['control-header']}>
                <Typography variant="h6" component="h2" className={styles['control-title']}>
                    Multi-Map Controls
                </Typography>
                <Chip 
                    label={`${visibleMaps.length}/${mapConfigs.length} maps`} 
                    size="small" 
                    color="primary" 
                />
            </Box>

            {/* Maps Section */}
            <Box className={styles['control-section']}>
                <Box 
                    className={styles['section-header']}
                    onClick={() => toggleSection('maps')}
                >
                    <Typography variant="subtitle1" className={styles['section-title']}>
                        <Layers className={styles['section-icon']} />
                        Map Management
                    </Typography>
                    <IconButton size="small">
                        {expandedSections.maps ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                </Box>

                <Collapse in={expandedSections.maps}>
                    <Stack spacing={2} className={styles['section-content']}>
                        <Box className={styles['map-actions']}>
                            {canAddMap && (
                                <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={onAddMap}
                                    startIcon={<Layers />}
                                >
                                    Add Map
                                </Button>
                            )}
                        </Box>

                        <Box className={styles['map-list']}>
                            {mapConfigs.map((config, index) => (
                                <Box key={config.id} className={styles['map-item']}>
                                    <Box className={styles['map-item-header']}>
                                        <Typography variant="body2" className={styles['map-item-title']}>
                                            {config.title} {index === 0 && '(Primary)'}
                                        </Typography>
                                        <Box className={styles['map-item-actions']}>
                                            <IconButton
                                                size="small"
                                                onClick={() => onToggleVisibility(config.id)}
                                                title={config.visible ? 'Hide map' : 'Show map'}
                                            >
                                                {config.visible ? <Visibility /> : <VisibilityOff />}
                                            </IconButton>
                                            {canRemoveMap && (
                                                <IconButton
                                                    size="small"
                                                    onClick={() => onRemoveMap(config.id)}
                                                    title="Remove map"
                                                >
                                                    <ExpandLess />
                                                </IconButton>
                                            )}
                                        </Box>
                                    </Box>
                                    
                                    {config.visible && (
                                        <Box className={styles['map-item-config']}>
                                            <FormControl size="small" fullWidth>
                                                <InputLabel>Dataset</InputLabel>
                                                <Select
                                                    value={config.dataset}
                                                    onChange={(e) => onUpdateMapConfig(config.id, { 
                                                        dataset: e.target.value, 
                                                        metric: '' 
                                                    })}
                                                    label="Dataset"
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

                                            {config.dataset && (
                                                <FormControl size="small" fullWidth>
                                                    <InputLabel>Metric</InputLabel>
                                                    <Select
                                                        value={config.metric}
                                                        onChange={(e) => onUpdateMapConfig(config.id, { 
                                                            metric: e.target.value 
                                                        })}
                                                        label="Metric"
                                                    >
                                                        <MenuItem value="">
                                                            <em>Select Metric</em>
                                                        </MenuItem>
                                                        {dataset && dataset[config.dataset] && 
                                                            Object.keys(dataset[config.dataset].columnThresholds || {}).map(metricName => (
                                                                <MenuItem key={metricName} value={metricName}>
                                                                    {metricName}
                                                                </MenuItem>
                                                            ))
                                                        }
                                                    </Select>
                                                </FormControl>
                                            )}
                                        </Box>
                                    )}
                                </Box>
                            ))}
                        </Box>
                    </Stack>
                </Collapse>
            </Box>

            <Divider className={styles['section-divider']} />

            {/* Vulnerability Indicators Section */}
            <Box className={styles['control-section']}>
                <Box 
                    className={styles['section-header']}
                    onClick={() => toggleSection('vulnerability')}
                >
                    <Typography variant="subtitle1" className={styles['section-title']}>
                        Primary Map Settings
                    </Typography>
                    <IconButton size="small">
                        {expandedSections.vulnerability ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                </Box>

                <Collapse in={expandedSections.vulnerability}>
                    <Stack spacing={2} className={styles['section-content']}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Dataset</InputLabel>
                            <Select
                                value={activeDataset}
                                label="Dataset"
                                onChange={(event) => onDatasetChange(event.target.value as string)}
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
                            onClick={() => console.log('Snapshot')}
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

                <Collapse in={expandedSections.points}>
                    <Stack spacing={1} className={styles['section-content']}>
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
                </Collapse>
            </Box>

            <Divider className={styles['section-divider']} />

           <Box className={styles['control-section']}>
                <Box
                    className={styles['section-header']}
                    onClick={() => toggleSection('hazards')}
                >
                    <Typography variant="subtitle1" className={styles['section-title']}>
                        Hazard Layers
                    </Typography>
                    <IconButton size="small">
                        {expandedSections.hazards ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                </Box>

                <Collapse in={expandedSections.hazards}>
                    <Stack spacing={1} className={styles['section-content']}>
                        {hazardLayers.map((hazard) => {
                            const IconComponent =
                                FaIcons[hazard.icon as keyof typeof FaIcons] ||
                                FaIcons.FaExclamationTriangle;

                            const [subLayersOpen, setSubLayersOpen] = useState(false);

                            return (
                                <div key={hazard.id} className={styles['layer-toggle']}>
                                    <div
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between'
                                        }}
                                    >
                                        <FormControlLabel
                                            control={
                                                <Checkbox
                                                    checked={hazard.visible}
                                                    onChange={() => toggleHazardLayer?.(hazard.id, true)}
                                                    size="small"
                                                />
                                            }
                                            label={
                                                <div className={styles['layer-label']}>
                                                    <span
                                                        className={styles['layer-icon']}
                                                        style={{ color: hazard.color }}
                                                    >
                                                        <IconComponent size="1rem" />
                                                    </span>
                                                    {hazard.name}
                                                </div>
                                            }
                                        />
                                        {hazard.subLayers?.length > 0 && (
                                            <IconButton 
                                                size="small" 
                                                onClick={() => setSubLayersOpen(!subLayersOpen)}
                                                title={subLayersOpen ? 'Hide sub-layers' : 'Show sub-layers'}
                                            >
                                                {subLayersOpen ? <ExpandLess /> : <ExpandMore />}
                                            </IconButton>
                                        )}
                                    </div>

                                    <Collapse in={subLayersOpen}>
                                        <Stack spacing={0.5} sx={{ pl: 4 }}>
                                            {hazard.subLayers?.map((sub) => (
                                                <FormControlLabel
                                                    key={sub.id}
                                                    control={
                                                        <Checkbox
                                                            checked={sub.visible}
                                                            onChange={() => toggleHazardLayer?.(sub.id, false)}
                                                            size="small"
                                                        />
                                                    }
                                                    label={sub.name}
                                                />
                                            ))}
                                        </Stack>
                                    </Collapse>
                                </div>
                            );
                        })}
                    </Stack>
                </Collapse>
            </Box>
        </Paper>
    );
};

