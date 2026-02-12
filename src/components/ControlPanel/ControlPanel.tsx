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
    Tooltip,
    Menu
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
    Refresh,
    Terrain,
    Palette,
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
import styles from './ControlPanel.module.scss';

interface IntegratedControlPanelProps {
    maxMaps: number;
}

export const ControlPanel: React.FC<IntegratedControlPanelProps> = ({
                                                                        maxMaps
                                                                    }) => {
    const dataset = useAppStore(state => state.blockGroupData);

    const mapConfigs = useMapStore(state => state.mapConfigs);
    const addMap = useMapStore(state => state.addMap);
    const removeMap = useMapStore(state => state.removeMap);
    const updateMapConfig = useMapStore(state => state.updateMapConfig);
    const toggleMapVisibility = useMapStore(state => state.toggleMapVisibility);
    const expandedSections = useMapStore(state => state.expandedSections);
    const expandedSectionsByMap = useMapStore(state => state.expandedSectionsByMap);
    const toggleSection = useMapStore(state => state.toggleSection);
    const toggleSectionByMap = useMapStore(state => state.toggleSectionByMap);
    const resetMapStore = useMapStore(state => state.reset);

    const { dataset: activeDataset, metric: activeDatasetMetric, setDataset, setMetric } = usePrimaryMapState();

    const pointLayerConfigs = usePointLayerStore(state => state.pointLayerConfigs);
    //const visiblePointLayerIds = usePointLayerStore(state => state.visibleLayerIds);
    const visiblePointLayerIdsByMap = usePointLayerStore(state => state.visibleLayerIdsByMap);
    const togglePointLayerVisibility = usePointLayerStore(state => state.toggleLayerVisibility);
    const setVisiblePointLayerIds = usePointLayerStore(state => state.setVisibleLayerIds);

    const hazardLayerConfigs = useHazardLayersStore(state => state.hazardLayerConfigs);
    const visibleHazardLayerIds = useHazardLayersStore(state => state.visibleLayerIds);
    const toggleHazardLayerVisibility = useHazardLayersStore(state => state.toggleHazardLayerVisibility);
    const toggleSubLayerVisibility = useHazardLayersStore(state => state.toggleSubLayerVisibility);
    const setVisibleHazardLayerIds = useHazardLayersStore(state => state.setVisibleLayerIds);

    const [expandedHazards, setExpandedHazards] = useState<Record<string, boolean>>({});
    const toggleExpand = useCallback((id: string) => {
        setExpandedHazards(prev => ({ ...prev, [id]: !prev[id] }));
    }, []);

    const rasterLayerConfigs = useRasterLayersStore((state) => state.rasterLayerConfigs);
    //const visibleRasterLayerIds = useRasterLayersStore((state) => state.visibleLayerIds);
    const visibleRasterLayerIdsByMap = useRasterLayersStore((state) => state.visibleLayerIdsByMap);
    const toggleRasterLayerVisibility = useRasterLayersStore((s) => s.toggleRasterLayerVisibility);
    const toggleSubRasterLayerVisibility = useRasterLayersStore((s) => s.toggleSubRasterLayerVisibility);
    const setVisibleRasterLayerIds = useRasterLayersStore((s) => s.setVisibleLayerIds);

    const [colorSchemeAnchor, setColorSchemeAnchor] = useState<Record<string, HTMLElement | null>>({});

    const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
    const togglePanelCollapse = useCallback(() => {
        setIsPanelCollapsed(prev => !prev);
    }, []);

    const [expandedRasters, setExpandedRasters] = useState<Record<string, boolean>>({});
    const toggleExpandRasters = useCallback((mapId: string, id: string) => {
      const key = `${mapId}.${id}`;
      setExpandedRasters(prev => ({ ...prev, [key]: !prev[key] }));
    }, []);

    // const pointLayers = useMemo(() =>
    //         pointLayerConfigs.map(config => ({
    //             ...config,
    //             visible: visiblePointLayerIds.has(config.id)
    //         })),
    //     [pointLayerConfigs, visiblePointLayerIds]
    // );

    const hazardLayers = useMemo(() =>
            hazardLayerConfigs.map(config => ({
                ...config,
                visible: visibleHazardLayerIds.has(config.id),
                subLayers: config.subLayers?.map(sub => ({
                    ...sub,
                    visible: visibleHazardLayerIds.has(`${config.id}.${sub.id}`)
                }))
            })),
        [hazardLayerConfigs, visibleHazardLayerIds]
    );

    // const rasterLayers = useMemo(() =>
    //         rasterLayerConfigs.map(config => ({
    //             ...config,
    //             visible: visibleRasterLayerIds.has(config.id),
    //             subLayers: config.subLayers?.map(sub => ({
    //                 ...sub,
    //                 visible: visibleRasterLayerIds.has(`${config.id}.${sub.id}`)
    //             }))
    //         })),
    //     [rasterLayerConfigs, visibleRasterLayerIds]
    // );

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

    // const handlePointLayerToggle = useCallback((layerId: string) => {
    //     togglePointLayerVisibility(layerId);
    // }, [togglePointLayerVisibility]);


    const handleMapVisibilityToggle = useCallback((mapId: string) => {
        // Simply toggle map visibility - don't clear point layers
        toggleMapVisibility(mapId);
    }, [toggleMapVisibility]);

    const handleRemoveMap = useCallback((mapId: string) => {
        // Clear point layers for the map being removed
        setVisiblePointLayerIds(mapId, []);
        // Remove the map
        removeMap(mapId);
    }, [removeMap, setVisiblePointLayerIds]);

    const handleResetView = useCallback(() => {
        // Reset stores
        resetMapStore();
        setDataset('');
        setMetric('');
        //setVisiblePointLayerIds([]);
        mapConfigs.forEach((map) => { setVisiblePointLayerIds(map.id, []); });
        setVisibleHazardLayerIds([]);
        //setVisibleRasterLayerIds([]);
        mapConfigs.forEach((map) => { setVisibleRasterLayerIds(map.id, []); });
    }, [resetMapStore, setDataset, setMetric, setVisiblePointLayerIds, setVisibleHazardLayerIds, setVisibleRasterLayerIds, mapConfigs]);

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
                                onClick={() => toggleSection( 'maps')}
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
                                                        {config.visible && config.dataset && config.metric && (
                                                            <>
                                                                <IconButton
                                                                    size="small"
                                                                    onClick={(e) => setColorSchemeAnchor(prev => ({ ...prev, [config.id]: e.currentTarget }))}
                                                                    title="Color scheme"
                                                                >
                                                                    <Palette fontSize="small" />
                                                                </IconButton>
                                                                <Menu
                                                                    anchorEl={colorSchemeAnchor[config.id] || null}
                                                                    open={Boolean(colorSchemeAnchor[config.id])}
                                                                    onClose={() => setColorSchemeAnchor(prev => ({ ...prev, [config.id]: null }))}
                                                                >
                                                                    {['viridis', 'reds', 'blues'].map(scheme => (
                                                                        <MenuItem
                                                                            key={scheme}
                                                                            selected={config.colorScheme === scheme || (!config.colorScheme && scheme === 'viridis')}
                                                                            onClick={() => {
                                                                                updateMapConfig(config.id, { colorScheme: scheme as 'viridis' | 'reds' | 'blues' });
                                                                                setColorSchemeAnchor(prev => ({ ...prev, [config.id]: null }));
                                                                            }}
                                                                        >
                                                                            {scheme.charAt(0).toUpperCase() + scheme.slice(1)}
                                                                        </MenuItem>
                                                                    ))}
                                                                </Menu>
                                                            </>
                                                        )}
                                                        <IconButton
                                                            size="small"
                                                            onClick={() => handleMapVisibilityToggle(config.id)}
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
                                                                onClick={() => handleRemoveMap(config.id)}
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

                                                        <Divider className={styles['section-divider']} />
                                                        {/* Add stuff within these brackerts */}
                                                        <Box
                                                            className={styles['section-header']}
                                                            onClick={() => toggleSectionByMap(config.id, 'points')}
                                                        >
                                                            <Typography variant="subtitle1" className={styles['section-title']}>
                                                                Points of Interest
                                                            </Typography>
                                                            <IconButton size="small">
                                                                {expandedSectionsByMap[config.id]?.points ? <ExpandLess /> : <ExpandMore />}
                                                            </IconButton>
                                                        </Box>
                                                        <Collapse in={expandedSectionsByMap[config.id]?.points ?? false}>
                                                        
                                                          <Stack spacing={1}>
                                                            {pointLayerConfigs.map((layer) => {
                                                              const IconComponent = 
                                                                FaIcons[layer.icon as keyof typeof FaIcons] || FaIcons.FaCircle;
                                                              const isVisible = 
                                                                visiblePointLayerIdsByMap[config.id]?.has(layer.id) ?? false;
                                                              
                                                                return (
                                                                  <FormControlLabel
                                                                    key={layer.id}
                                                                    control={
                                                                      <Checkbox 
                                                                        checked={isVisible}
                                                                        onChange={() =>
                                                                          togglePointLayerVisibility(config.id, layer.id)
                                                                        }
                                                                        size="small"
                                                                        />
                                                                    }
                                                                    label={
                                                                      <div className={styles['layer-label']}>
                                                                        <span
                                                                          className={styles['layer-icon']}
                                                                          style={{ color: layer.color}}
                                                                        >
                                                                          <IconComponent size="1rem" />
                                                                        </span>
                                                                        {layer.name}
                                                                      </div>
                                                                    }
                                                                  />
                                                                );
                                                            })}
                                                          </Stack>
                                                        </Collapse>
                                                        {/* end of section */}

                                                        <Divider className={styles['section-divider']} />
                                                        {/* Add stuff withing these brackerts */}
                                                        <Box 
                                                            className={styles['section-header']}
                                                            onClick={() => toggleSectionByMap(config.id, 'rasters')}
                                                        >
                                                            <Typography variant="subtitle1" className={styles['section-title']}>
                                                                Hazards (Rasters)
                                                            </Typography>
                                                            <IconButton size="small">
                                                                {expandedSectionsByMap[config.id]?.rasters ? <ExpandLess /> : <ExpandMore />}
                                                            </IconButton>
                                                        </Box>

                                                        <Collapse in={expandedSectionsByMap[config.id]?.rasters ?? false}>
                                                          <Stack spacing={1} className={styles['section-content']}>
                                                          {rasterLayerConfigs.map((parent) => {
                                                            const ParentIcon =
                                                              FaIcons[parent.icon as keyof typeof FaIcons] || FaIcons.FaMap;

                                                            const hasChildren = !!parent.subLayers?.length;
                                                            const CHECKBOX_WIDTH = 15;
                                                            const visibleRasterIdsForMap = visibleRasterLayerIdsByMap[config.id] ?? new Set<string>();
                                                            const isParentVisible = visibleRasterIdsForMap.has(parent.id);

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
                                                                        checked={isParentVisible}
                                                                        onChange={() =>
                                                                          toggleRasterLayerVisibility(config.id, parent.id)
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
                                                                      onClick={() => toggleExpandRasters(config.id,parent.id)}
                                                                    >
                                                                      {expandedRasters[`${config.id}.${parent.id}`] ? (
                                                                        <ExpandLess />
                                                                      ) : (
                                                                        <ExpandMore />
                                                                      )}
                                                                    </IconButton>
                                                                  )}
                                                                </Box>
                                                    
                                                                {/* === Sublayers === */}
                                                                {hasChildren && (
                                                                  <Collapse in={expandedRasters[`${config.id}.${parent.id}`]}>
                                                                    <Stack spacing={1} sx={{ pl: 3 }}>
                                                                      {parent.subLayers!.map((sub) => {
                                                                        const compositeId = `${parent.id}.${sub.id}`;
                                                                        const isSubVisible = visibleRasterIdsForMap.has(compositeId);
                                                                        return (
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
                                                                                checked={isSubVisible}
                                                                                onChange={() =>
                                                                                  toggleSubRasterLayerVisibility(
                                                                                    config.id,
                                                                                    parent.id,
                                                                                    sub.id
                                                                                  )
                                                                                }
                                                                                size="small"
                                                                              />
                                                                            }
                                                                            label={sub.name}
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
                                                        
                                                        {/* end of section */}

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
                                    <Button
                                        onClick={handleResetView}
                                        variant="outlined"
                                        startIcon={<Refresh />}
                                        fullWidth
                                        size="small"
                                        color="secondary"
                                    >
                                        Reset View
                                    </Button>
                                </Stack>
                            </Collapse>
                        </Box>

                        <Divider className={styles['section-divider']} />

                        {/* Points of Interest Section */}
                        {/* <Box className={styles['control-section']}>
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
                        </Box> */}

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
                {/* <Box 
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

                    return (
                      <Box key={parent.id} className={styles['layer-toggle']}>
                        
                        <Box display="flex" alignItems="center">
                         
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
              </Collapse> */}
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
                            <Tooltip title="Hazards (Rasters)" placement="left">
        <Box className={styles['collapsed-section']} onClick={() => setIsPanelCollapsed(false)}>
            <Terrain />
        </Box>
    </Tooltip>
                    </Box>
                )}
            </Paper>
        </div>
    );
};
