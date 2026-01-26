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
import {
  useAppStore, 
  useMapStore, 
  usePointLayerStore, 
  usePrimaryMapState,
  useHazardLayersStore,
  useRasterLayersStore
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

    const rasterLayers = useRasterLayersStore((state) => state.rasterLayers);
    const toggleRasterLayerVisibility = useRasterLayersStore((s) => s.toggleRasterLayerVisibility);
    const toggleSubRasterLayerVisibility = useRasterLayersStore((s) => s.toggleSubRasterLayerVisibility);

    const [expandedHazards, setExpandedHazards] = useState<Record<string, boolean>>({});
    const toggleExpandHazards = useCallback((id: string) => {
      setExpandedHazards(prev => ({ ...prev, [id]: !prev[id] }));
    }, []);

    const [expandedRasters, setExpandedRasters] = useState<Record<string, boolean>>({});
    const toggleExpandRasters = useCallback((id: string) => {
      setExpandedRasters(prev => ({ ...prev, [id]: !prev[id] }));
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

    const datasetMetrics = useMemo(() => {
        if (!dataset || !activeDataset) return [];
        const datasetObject = dataset[activeDataset];
        if (!datasetObject?.columnThresholds) return [];
        return Object.keys(datasetObject.columnThresholds).map(columnName => ({
            id: columnName,
            label: columnName
        }));
    }, [dataset, activeDataset]);

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

    // === Replace both handlers ===
    // const handleHazardParentToggle = useCallback(
    //   (parentId: string) => {
    //     const updated = hazardLayers.map((h) => {
    //       if (h.id === parentId) {
    //         return { ...h, visible: !h.visible };
    //       }
    //       return h;
    //     });
    //     setHazardLayers(updated);
    //   },
    //   [hazardLayers, setHazardLayers]
    // );

    // const handleSubHazardToggle = useCallback(
    //   (parentId: string, subId: string) => {
    //     const updated = hazardLayers.map((h) => {
    //       if (h.id === parentId && h.subLayers) {
    //         const subLayers = h.subLayers.map((s) =>
    //           s.id === subId ? { ...s, visible: !s.visible } : s
    //         );

    //         const anyVisible = subLayers.some((s) => s.visible);
    //         return { ...h, visible: anyVisible, subLayers };
    //       }
    //       return h;
    //     });
    //     setHazardLayers(updated);
    //   },
    //   [hazardLayers, setHazardLayers]
    // );

    // // Snapshot handler
    // const handleTakeSnapshot = useCallback(async () => {
    //     try {
    //         await takeSnapshot({
    //             activeDataset: urlState.dataset,
    //             activeDatasetMetric: urlState.metric,
    //             customPrefix: 'hawaii-census-map',
    //             quality: 0.9
    //         }, mapWrapperRef);
    //     } catch (error) {
    //         alert(`Failed to take snapshot. Please try again. ${error}`);
    //     }
    // }, [takeSnapshot, urlState.dataset, urlState.metric]);
    // }, []);

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
                                    onClick={addMap}
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
                                                onClick={() => toggleMapVisibility(config.id)}
                                                title={config.visible ? 'Hide map' : 'Show map'}
                                            >
                                                {config.visible ? <Visibility /> : <VisibilityOff />}
                                            </IconButton>
                                            {canRemoveMap && (
                                                <IconButton
                                                    size="small"
                                                    onClick={() => removeMap(config.id)}
                                                    title="Remove map"
                                                >
                                                    <Close />
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
                                                    onChange={(e) => updateMapConfig(config.id, {
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
                                onChange={(event) => setDataset(event.target.value as string)}
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
                        Hazards (Shapes)
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
                          {/* --- Parent checkbox + expand toggle --- */}
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
                                onClick={() => toggleExpandHazards(parent.id)}>
                                {expandedHazards[parent.id] ? <ExpandLess /> : <ExpandMore />}
                              </IconButton>
                            )}
                          </Box>

                          {/* --- Sublayers (collapsible, independent of visibility) --- */}
                          {parent.subLayers && parent.subLayers.length > 0 && (
                            <Collapse in={expandedHazards[parent.id]}>
                              <Stack spacing={1} sx={{ pl: 3 }}>
                                {parent.subLayers.map((sub) => {

                                  return (
                                    <FormControlLabel
                                      sx={{
                                        ml: 0,        
                                        '& .MuiFormControlLabel-label': {
                                          ml: -4.2,       
                                        },
                                      }}
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

            <Divider className={styles['section-divider']} />


            <Box className={styles['control-section']}>
                <Box 
                    className={styles['section-header']}
                    onClick={() => toggleSection('rasters')}
                >
                    <Typography variant="subtitle1" className={styles['section-title']}>
                        Hazards (Rasters)
                    </Typography>
                    <IconButton size="small">
                        {expandedSections.rasters ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                </Box>

                <Collapse in={expandedSections.rasters}>
                  <Stack spacing={1} className={styles['section-content']}>
                  {rasterLayers.map((parent) => {
                    const ParentIcon =
                      FaIcons[parent.icon as keyof typeof FaIcons] || FaIcons.FaMap;

                    const hasChildren = !!parent.subLayers?.length;
                    const CHECKBOX_WIDTH = 15;
                    // const anyChildVisible =
                    //   hasChildren && parent.subLayers!.some((s) => s.visible);

                    return (
                      <Box key={parent.id} className={styles['layer-toggle']}>
                        {/* === Parent row === */}
                        <Box display="flex" alignItems="center">
                          {/* Checkbox OR spacer */}
                          <Box
                            sx={{
                              width: CHECKBOX_WIDTH,
                              display: 'flex',
                              justifyContent: 'center',
                            }}
                          >
                            {!hasChildren && (
                              <Checkbox
                                checked={parent.visible}
                                onChange={() =>
                                  toggleRasterLayerVisibility(parent.id)
                                }
                                size="small"
                              />
                            )}
                          </Box>
            
                          {/* Label */}
                          <Typography
                            className={styles['layer-label']}
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              flexGrow: 1,
                              ml: '21px', 
                            }}
                          >
                            <span
                              className={styles['layer-icon']}
                              style={{ color: parent.color }}
                            >
                              <ParentIcon size="1rem" />
                            </span>
                            {parent.name}
                          </Typography>
            
                          {/* Expand */}
                          {hasChildren && (
                            <IconButton
                              size="small"
                              className={styles['expand-icon']}
                              onClick={() => toggleExpandRasters(parent.id)}
                            >
                              {expandedRasters[parent.id] ? (
                                <ExpandLess />
                              ) : (
                                <ExpandMore />
                              )}
                            </IconButton>
                          )}
                        </Box>
            
                        {/* === Sublayers === */}
                        {hasChildren && (
                          <Collapse in={expandedRasters[parent.id]}>
                            <Stack spacing={1} sx={{ pl: 3 }}>
                              {parent.subLayers!.map((sub) => (
                                <FormControlLabel
                                  sx={{
                                    ml: 0,        
                                    '& .MuiFormControlLabel-label': {
                                      ml: 0.9,       
                                    },
                                  }}
                                  key={sub.id}
                                  control={
                                    <Checkbox
                                      checked={sub.visible}
                                      onChange={() =>
                                        toggleSubRasterLayerVisibility(
                                          parent.id,
                                          sub.id
                                        )
                                      }
                                      size="small"
                                    />
                                  }
                                  label={sub.name}
                                />
                              ))}
                            </Stack>
                          </Collapse>
                        )}
                      </Box>
                    );
                  })}
                </Stack>
              </Collapse>
            </Box>
          </Paper>
        );
      };