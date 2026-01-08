import React, { useMemo, useCallback, useState } from 'react';
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
    Chip,
    Tooltip
} from '@mui/material';
import {
    Camera,
    ExpandMore,
    ExpandLess,
    Layers,
    Visibility,
    VisibilityOff,
    Close,
    ChevronLeft,
    ChevronRight,
    LocationOn,
    Warning,
} from '@mui/icons-material';
import * as FaIcons from 'react-icons/fa';
import {
    useAppStore,
    useMapStore,
    usePointLayerStore,
    usePrimaryMapState,
    useHazardLayersStore
} from "../../stores";
import { useUrlState } from '../../hooks/useUrlState';
import styles from './ControlPanel.module.scss';

interface IntegratedControlPanelProps {
    maxMaps: number;
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

    const hazardLayers = useHazardLayersStore((state) => state.hazardLayers);
    const toggleHazardLayerVisibility = useHazardLayersStore((s) => s.toggleHazardLayerVisibility);
    const toggleSubLayerVisibility = useHazardLayersStore((s) => s.toggleSubLayerVisibility);

    const toggleParent = useHazardLayersStore(
        (state) => state.toggleHazardLayerVisibility
    );
    const toggleChild = useHazardLayersStore(
        (state) => state.toggleSubLayerVisibility
    );

    const [expandedHazards, setExpandedHazards] = useState<Record<string, boolean>>({});
    const toggleExpand = useCallback((id: string) => {
        setExpandedHazards(prev => ({ ...prev, [id]: !prev[id] }));
    }, []);

    const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
    const togglePanelCollapse = useCallback(() => {
        setIsPanelCollapsed(prev => !prev);
    }, []);

    const pointLayers = useMemo(() =>
            pointLayerConfigs.map(config => ({
                ...config,
                visible: visibleLayerIds.has(config.id)
            })),
        [pointLayerConfigs, visibleLayerIds]
    );

    const datasetList = useMemo(() => {
        if (!dataset) return [];
        return Object.entries(dataset).map(([key, config]) => ({
            id: key,
            label: config.metricLabel || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            hawaiianHomelands: config.hawaiianHomelands || false
        }));
    }, [dataset]);

    const visibleMaps = useMemo(() =>
            mapConfigs.filter((config) => config.visible),
        [mapConfigs]
    );
    const canAddMap = mapConfigs.length < maxMaps;
    const canRemoveMap = mapConfigs.length > 1;

    const handlePointLayerToggle = useCallback((layerId: string) => {
        toggleLayerVisibility(layerId);

        // Update URL state
        const currentVisible = urlState.pointLayers;
        const newVisible = currentVisible.includes(layerId)
            ? currentVisible.filter(id => id !== layerId)
            : [...currentVisible, layerId];
        updateUrlState({ pointLayers: newVisible });
    }, [toggleLayerVisibility, urlState.pointLayers, updateUrlState]);

    const handleSnapshot = useCallback(() => {
        console.log('Snapshot');
    }, []);

    return (
        <div className={styles['panel-wrapper']}>
            <IconButton
                onClick={togglePanelCollapse}
                className={styles['collapse-toggle']}
                size="small"
            >
                {isPanelCollapsed ? <ChevronLeft /> : <ChevronRight />}
            </IconButton>

            <Paper
                className={`${styles['integrated-control-panel']} ${isPanelCollapsed ? styles['collapsed'] : ''}`}
                elevation={2}
            >
                {!isPanelCollapsed ? (
                    <>
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
                                                onClick={addMap}
                                                startIcon={<Layers />}
                                            >
                                                Add Map
                                            </Button>
                                        )}
                                    </Box>

                                    <Box className={styles['map-list']}>
                                        {mapConfigs.map((config) => (
                                            <Box key={config.id} className={styles['map-item']}>
                                                <Box className={styles['map-item-header']}>
                                                    <Typography variant="body2" className={styles['map-item-title']}>
                                                        Map {config.id}
                                                    </Typography>
                                                    <Box className={styles['map-item-actions']}>
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => toggleMapVisibility(config.id)}
                                                            title={config.visible ? 'Hide map' : 'Show map'}
                                                        >
                                                            {config.visible ? (
                                                                <Visibility fontSize="small" />
                                                            ) : (
                                                                <VisibilityOff fontSize="small" />
                                                            )}
                                                        </IconButton>
                                                        {canRemoveMap && (
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => removeMap(config.id)}
                                                                title="Remove map"
                                                                color="error"
                                                            >
                                                                <Close fontSize="small" />
                                                            </IconButton>
                                                        )}
                                                    </Box>
                                                </Box>

                                                {config.visible && (
                                                    <Box className={styles['map-item-config']}>
                                                        <FormControl size="small" fullWidth>
                                                            <InputLabel>Dataset</InputLabel>
                                                            <Select
                                                                value={config.dataset || ''}
                                                                onChange={(e) =>
                                                                    updateMapConfig(config.id, {
                                                                        dataset: e.target.value,
                                                                    })
                                                                }
                                                                label="Dataset"
                                                            >
                                                                {datasetList.map((ds) => (
                                                                    <MenuItem key={ds.id} value={ds.id}>
                                                                        {ds.label}
                                                                    </MenuItem>
                                                                ))}
                                                            </Select>
                                                        </FormControl>

                                                        {config.dataset && (
                                                            <FormControl size="small" fullWidth>
                                                                <InputLabel>Metric</InputLabel>
                                                                <Select
                                                                    value={config.metric}
                                                                    onChange={(e) => updateMapConfig(config.id, {
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

                        {/* Dashboard Utils Section */}
                        <Box className={styles['control-section']}>
                            <Box
                                className={styles['section-header']}
                                onClick={() => toggleSection('utils')}
                            >
                                <Typography variant="subtitle1" className={styles['section-title']}>
                                    Dashboard Utilities
                                </Typography>
                                <IconButton size="small">
                                    {expandedSections.utils ? <ExpandLess /> : <ExpandMore />}
                                </IconButton>
                            </Box>

                            <Collapse in={expandedSections.utils}>
                                <Stack spacing={2} className={styles['section-content']}>
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

                        <Box className={styles['control-section']}>
                            <Box
                                className={styles['section-header']}
                                onClick={() => toggleSection('hazards')}
                            >
                                <Typography variant="subtitle1" className={styles['section-title']}>
                                    Hazards
                                </Typography>
                                <IconButton size="small">
                                    {expandedSections.hazards ? <ExpandLess /> : <ExpandMore />}
                                </IconButton>
                            </Box>

                            <Collapse in={expandedSections.hazards}>
                                <Stack spacing={1} className={styles['section-content']}>
                                    {hazardLayers.map((parent) => {
                                        const ParentIcon =
                                            FaIcons[parent.icon as keyof typeof FaIcons] || FaIcons.FaExclamationTriangle;

                                        return (
                                            <Box key={parent.id} className={styles['layer-toggle']}>
                                                <Box display="flex" alignItems="center">
                                                    <FormControlLabel
                                                        control={
                                                            <Checkbox
                                                                checked={parent.visible}
                                                                onChange={() => toggleHazardLayerVisibility(parent.id)}
                                                                size="small"
                                                            />
                                                        }
                                                        label={
                                                            <div className={styles['layer-label']}>
                                              <span
                                                  className={styles['layer-icon']}
                                                  style={{ color: parent.color }}
                                              >
                                                <ParentIcon size="1rem" />
                                              </span>
                                                                {parent.name}
                                                            </div>
                                                        }
                                                    />
                                                    {(parent.subLayers ?? []).length > 0 && (
                                                        <IconButton
                                                            size="small"
                                                            className={styles['expand-icon']}
                                                            onClick={() => toggleExpand(parent.id)}>
                                                            {expandedHazards[parent.id] ? <ExpandLess /> : <ExpandMore />}
                                                        </IconButton>
                                                    )}
                                                </Box>

                                                {parent.subLayers && parent.subLayers.length > 0 && (
                                                    <Collapse in={expandedHazards[parent.id]}>
                                                        <Stack spacing={1} sx={{ pl: 3 }}>
                                                            {parent.subLayers.map((sub) => {
                                                                return (
                                                                    <FormControlLabel
                                                                        key={sub.id}
                                                                        control={
                                                                            <Checkbox
                                                                                checked={sub.visible}
                                                                                onChange={() => toggleSubLayerVisibility(parent.id, sub.id)}
                                                                                size="small"
                                                                            />
                                                                        }
                                                                        label={
                                                                            <div className={styles['layer-label']}>
                                                      <span
                                                          className={styles['layer-icon']}
                                                          style={{ color: sub.color ?? parent.color ?? '#666' }}
                                                      >

                                                      </span>
                                                                                {sub.name}
                                                                            </div>
                                                                        }
                                                                    />
                                                                );
                                                            })}
                                                        </Stack>
                                                    </Collapse>
                                                )}
                                            </Box>
                                        );
                                    })}
                                </Stack>
                            </Collapse>
                        </Box>
                    </>
                ) : (
                    <Box className={styles['collapsed-sidebar']}>
                        <Tooltip title="Map Management" placement="left">
                            <Box className={styles['collapsed-section']} onClick={() => setIsPanelCollapsed(false)}>
                                <Layers />
                            </Box>
                        </Tooltip>
                        <Tooltip title="Dashboard Utilities" placement="left">
                            <Box className={styles['collapsed-section']} onClick={() => setIsPanelCollapsed(false)}>
                                <Camera />
                            </Box>
                        </Tooltip>
                        <Tooltip title="Points of Interest" placement="left">
                            <Box className={styles['collapsed-section']} onClick={() => setIsPanelCollapsed(false)}>
                                <LocationOn />
                            </Box>
                        </Tooltip>
                        <Tooltip title="Hazards" placement="left">
                            <Box className={styles['collapsed-section']} onClick={() => setIsPanelCollapsed(false)}>
                                <Warning />
                            </Box>
                        </Tooltip>
                    </Box>
                )}
            </Paper>
        </div>
    );
};