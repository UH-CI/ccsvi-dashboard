import React, { useMemo, useCallback, useState } from "react";
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
  Menu,
  Slider,
} from "@mui/material";
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
} from "@mui/icons-material";
import * as FaIcons from "react-icons/fa";
import {
  useAppStore,
  useMapStore,
  usePointLayerStore,
  usePrimaryMapState,
  useHazardLayersStore,
  useRasterLayersStore,
  DEFAULT_LAYER_OPACITIES,
} from "../../stores";
import styles from "./ControlPanel.module.scss";

interface IntegratedControlPanelProps {
  maxMaps: number;
}

export const ControlPanel: React.FC<IntegratedControlPanelProps> = ({ maxMaps }) => {
  const dataset = useAppStore((state) => state.blockGroupData);

  const mapConfigs = useMapStore((state) => state.mapConfigs);
  const addMap = useMapStore((state) => state.addMap);
  const removeMap = useMapStore((state) => state.removeMap);
  const updateMapConfig = useMapStore((state) => state.updateMapConfig);
  const toggleMapVisibility = useMapStore((state) => state.toggleMapVisibility);
  const expandedSections = useMapStore((state) => state.expandedSections);
  const expandedSectionsByMap = useMapStore((state) => state.expandedSectionsByMap);
  const toggleSection = useMapStore((state) => state.toggleSection);
  const toggleSectionByMap = useMapStore((state) => state.toggleSectionByMap);
  const resetMapStore = useMapStore((state) => state.reset);
  const layerOpacities = useMapStore((state) => state.layerOpacities);
  const setLayerOpacity = useMapStore((state) => state.setLayerOpacity);

  const {
    dataset: activeDataset,
    metric: activeDatasetMetric,
    setDataset,
    setMetric,
  } = usePrimaryMapState();

  const pointLayerConfigs = usePointLayerStore((state) => state.pointLayerConfigs);
  const visiblePointLayerIdsByMap = usePointLayerStore((state) => state.visibleLayerIdsByMap);
  const togglePointLayerVisibility = usePointLayerStore((state) => state.toggleLayerVisibility);
  const setVisiblePointLayerIds = usePointLayerStore((state) => state.setVisibleLayerIds);

  // Per-map hazard store (Aaron's version)
  const hazardLayerConfigs = useHazardLayersStore((state) => state.hazardLayerConfigs);
  const visibleHazardLayerIdsByMap = useHazardLayersStore((state) => state.visibleLayerIdsByMap);
  const toggleHazardLayerVisibility = useHazardLayersStore(
    (state) => state.toggleHazardLayerVisibility,
  );
  const toggleSubLayerVisibility = useHazardLayersStore((state) => state.toggleSubLayerVisibility);
  const setVisibleHazardLayerIds = useHazardLayersStore((state) => state.setVisibleLayerIds);

  // Per-map expand state keyed by "mapId.layerId"
  const [expandedHazards, setExpandedHazards] = useState<Record<string, boolean>>({});
  const toggleExpand = useCallback((mapId: string, id: string) => {
    const key = `${mapId}.${id}`;
    setExpandedHazards((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const rasterLayerConfigs = useRasterLayersStore((state) => state.rasterLayerConfigs);
  const visibleRasterLayerIdsByMap = useRasterLayersStore((state) => state.visibleLayerIdsByMap);
  const toggleRasterLayerVisibility = useRasterLayersStore((s) => s.toggleRasterLayerVisibility);
  const toggleSubRasterLayerVisibility = useRasterLayersStore(
    (s) => s.toggleSubRasterLayerVisibility,
  );
  const setVisibleRasterLayerIds = useRasterLayersStore((s) => s.setVisibleLayerIds);

  const [colorSchemeAnchor, setColorSchemeAnchor] = useState<Record<string, HTMLElement | null>>(
    {},
  );

  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const togglePanelCollapse = useCallback(() => {
    setIsPanelCollapsed((prev) => !prev);
  }, []);

  const [expandedRasters, setExpandedRasters] = useState<Record<string, boolean>>({});
  const toggleExpandRasters = useCallback((mapId: string, id: string) => {
    const key = `${mapId}.${id}`;
    setExpandedRasters((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  // Derive visible flags per-map for hazard layers (HEAD's useMemo pattern, Aaron's per-map source)
  const hazardLayers = useMemo(
    () =>
      hazardLayerConfigs.map((config) => ({
        ...config,
        subLayers: config.subLayers,
      })),
    [hazardLayerConfigs],
  );

  const datasetList = useMemo(() => {
    if (!dataset) return [];
    return Object.entries(dataset).map(([key, config]) => ({
      id: key,
      label: config.metricLabel || key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      hawaiianHomelands: config.hawaiianHomelands || false,
    }));
  }, [dataset]);

  const visibleMaps = useMemo(() => mapConfigs.filter((config) => config.visible), [mapConfigs]);
  const canAddMap = mapConfigs.length < maxMaps;
  const canRemoveMap = mapConfigs.length > 1;

  const handleMapVisibilityToggle = useCallback(
    (mapId: string) => {
      toggleMapVisibility(mapId);
    },
    [toggleMapVisibility],
  );

  const handleRemoveMap = useCallback(
    (mapId: string) => {
      setVisiblePointLayerIds(mapId, []);
      setVisibleRasterLayerIds(mapId, []);
      setVisibleHazardLayerIds(mapId, []);
      removeMap(mapId);
    },
    [removeMap, setVisiblePointLayerIds, setVisibleRasterLayerIds, setVisibleHazardLayerIds],
  );

  const handleResetView = useCallback(() => {
    resetMapStore();
    setDataset("");
    setMetric("");
    mapConfigs.forEach((map) => {
      setVisiblePointLayerIds(map.id, []);
      setVisibleHazardLayerIds(map.id, []);
      setVisibleRasterLayerIds(map.id, []);
    });
  }, [
    resetMapStore,
    setDataset,
    setMetric,
    setVisiblePointLayerIds,
    setVisibleHazardLayerIds,
    setVisibleRasterLayerIds,
    mapConfigs,
  ]);

  const handleSnapshot = useCallback(() => {
    console.log("Snapshot");
  }, []);

  return (
    <div className={styles["panel-wrapper"]}>
      <IconButton onClick={togglePanelCollapse} className={styles["collapse-toggle"]} size="small">
        {isPanelCollapsed ? <ChevronLeft /> : <ChevronRight />}
      </IconButton>

      <Paper
        className={`${styles["integrated-control-panel"]} ${isPanelCollapsed ? styles["collapsed"] : ""}`}
        elevation={2}
      >
        {!isPanelCollapsed ? (
          <>
            <Box className={styles["control-header"]}>
              <Typography variant="h6" component="h2" className={styles["control-title"]}>
                Multi-Map Controls
              </Typography>
              <Chip
                label={`${visibleMaps.length}/${mapConfigs.length} maps`}
                size="small"
                color="primary"
              />
            </Box>

            {/* Maps Section */}
            <Box className={styles["control-section"]}>
              <Box className={styles["section-header"]} onClick={() => toggleSection("maps")}>
                <Typography variant="subtitle1" className={styles["section-title"]}>
                  <Layers className={styles["section-icon"]} />
                  Map Management
                </Typography>
                <IconButton size="small">
                  {expandedSections.maps ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Box>

              <Collapse in={expandedSections.maps}>
                <Stack spacing={2} className={styles["section-content"]}>
                  <Box className={styles["map-actions"]}>
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

                  <Box className={styles["map-list"]}>
                    {mapConfigs.map((config) => (
                      <Box key={config.id} className={styles["map-item"]}>
                        <Box className={styles["map-item-header"]}>
                          <Typography variant="body2" className={styles["map-item-title"]}>
                            Map {config.id}
                          </Typography>
                          <Box className={styles["map-item-actions"]}>
                            {config.visible && config.dataset && config.metric && (
                              <>
                                <IconButton
                                  size="small"
                                  onClick={(e) =>
                                    setColorSchemeAnchor((prev) => ({
                                      ...prev,
                                      [config.id]: e.currentTarget,
                                    }))
                                  }
                                  title="Color scheme"
                                >
                                  <Palette fontSize="small" />
                                </IconButton>
                                <Menu
                                  anchorEl={colorSchemeAnchor[config.id] || null}
                                  open={Boolean(colorSchemeAnchor[config.id])}
                                  onClose={() =>
                                    setColorSchemeAnchor((prev) => ({ ...prev, [config.id]: null }))
                                  }
                                >
                                  {["viridis", "reds", "blues"].map((scheme) => (
                                    <MenuItem
                                      key={scheme}
                                      selected={
                                        config.colorScheme === scheme ||
                                        (!config.colorScheme && scheme === "viridis")
                                      }
                                      onClick={() => {
                                        updateMapConfig(config.id, {
                                          colorScheme: scheme as "viridis" | "reds" | "blues",
                                        });
                                        setColorSchemeAnchor((prev) => ({
                                          ...prev,
                                          [config.id]: null,
                                        }));
                                      }}
                                    >
                                      {scheme.charAt(0).toUpperCase() + scheme.slice(1)}
                                    </MenuItem>
                                  ))}

                                  <Divider />

                                  {/* Opacity Controls */}
                                  <Box sx={{ px: 2, py: 1.5, minWidth: 200 }}>
                                    <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 1 }}>
                                      Layer Opacity
                                    </Typography>

                                    {/* Show Census Blocks control only for non-Hawaiian Homelands datasets */}
                                    {config.dataset && dataset?.[config.dataset] && !dataset[config.dataset].hawaiianHomelands && (
                                      <Box sx={{ mb: 2 }}>
                                        <Typography variant="caption" gutterBottom display="block">
                                          Census Blocks
                                        </Typography>
                                        <Slider
                                          value={layerOpacities[config.id]?.census ?? DEFAULT_LAYER_OPACITIES.census}
                                          onChange={(_, value) =>
                                            setLayerOpacity(config.id, "census", value as number)
                                          }
                                          min={0}
                                          max={1}
                                          step={0.1}
                                          marks
                                          valueLabelDisplay="auto"
                                          size="small"
                                        />
                                      </Box>
                                    )}

                                    {/* Show Hawaiian Homelands and County Boundaries controls only for Hawaiian Homelands datasets */}
                                    {config.dataset && dataset?.[config.dataset]?.hawaiianHomelands && (
                                      <>
                                        <Box sx={{ mb: 2 }}>
                                          <Typography variant="caption" gutterBottom display="block">
                                            Hawaiian Homelands
                                          </Typography>
                                          <Slider
                                            value={layerOpacities[config.id]?.hawaiianHomelands ?? DEFAULT_LAYER_OPACITIES.hawaiianHomelands}
                                            onChange={(_, value) =>
                                              setLayerOpacity(config.id, "hawaiianHomelands", value as number)
                                            }
                                            min={0}
                                            max={1}
                                            step={0.1}
                                            marks
                                            valueLabelDisplay="auto"
                                            size="small"
                                          />
                                        </Box>
                                        <Box>
                                          <Typography variant="caption" gutterBottom display="block">
                                            County Boundaries
                                          </Typography>
                                          <Slider
                                            value={layerOpacities[config.id]?.countyBoundaries ?? DEFAULT_LAYER_OPACITIES.countyBoundaries}
                                            onChange={(_, value) =>
                                              setLayerOpacity(config.id, "countyBoundaries", value as number)
                                            }
                                            min={0}
                                            max={1}
                                            step={0.1}
                                            marks
                                            valueLabelDisplay="auto"
                                            size="small"
                                          />
                                        </Box>
                                      </>
                                    )}
                                  </Box>
                                </Menu>
                              </>
                            )}
                            <IconButton
                              size="small"
                              onClick={() => handleMapVisibilityToggle(config.id)}
                              title={config.visible ? "Hide map" : "Show map"}
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
                          <Box className={styles["map-item-config"]}>
                            <FormControl size="small" fullWidth>
                              <InputLabel>Dataset</InputLabel>
                              <Select
                                value={config.dataset || ""}
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
                                  onChange={(e) =>
                                    updateMapConfig(config.id, {
                                      metric: e.target.value,
                                    })
                                  }
                                  label="Metric"
                                >
                                  <MenuItem value="">
                                    <em>Select Metric</em>
                                  </MenuItem>
                                  {dataset &&
                                    dataset[config.dataset] &&
                                    Object.keys(dataset[config.dataset].columnThresholds || {}).map(
                                      (metricName) => (
                                        <MenuItem key={metricName} value={metricName}>
                                          {metricName}
                                        </MenuItem>
                                      ),
                                    )}
                                </Select>
                              </FormControl>
                            )}

                            <Divider className={styles["section-divider"]} />

                            {/* Points of Interest */}
                            <Box
                              className={styles["section-header"]}
                              onClick={() => toggleSectionByMap(config.id, "points")}
                            >
                              <Typography variant="subtitle1" className={styles["section-title"]}>
                                Points of Interest
                              </Typography>
                              <IconButton size="small">
                                {expandedSectionsByMap[config.id]?.points ? (
                                  <ExpandLess />
                                ) : (
                                  <ExpandMore />
                                )}
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
                                  );
                                })}
                              </Stack>
                            </Collapse>

                            <Divider className={styles["section-divider"]} />

                            {/* Hazards (Shapes) */}
                            <Box
                              className={styles["section-header"]}
                              onClick={() => toggleSectionByMap(config.id, "hazards")}
                            >
                              <Typography variant="subtitle1" className={styles["section-title"]}>
                                Hazards (Shapes)
                              </Typography>
                              <IconButton size="small">
                                {expandedSectionsByMap[config.id]?.hazards ? (
                                  <ExpandLess />
                                ) : (
                                  <ExpandMore />
                                )}
                              </IconButton>
                            </Box>

                            <Collapse in={expandedSectionsByMap[config.id]?.hazards ?? false}>
                              <Stack spacing={1} className={styles["section-content"]}>
                                {hazardLayers.map((parent) => {
                                  const ParentIcon =
                                    FaIcons[parent.icon as keyof typeof FaIcons] ||
                                    FaIcons.FaExclamationTriangle;
                                  const isParentVisible =
                                    visibleHazardLayerIdsByMap[config.id]?.has(parent.id) ?? false;

                                  return (
                                    <Box key={parent.id} className={styles["layer-toggle"]}>
                                      <Box display="flex" alignItems="center">
                                        <FormControlLabel
                                          control={
                                            <Checkbox
                                              checked={isParentVisible}
                                              onChange={() =>
                                                toggleHazardLayerVisibility(config.id, parent.id)
                                              }
                                              size="small"
                                            />
                                          }
                                          label={
                                            <div className={styles["layer-label"]}>
                                              <span
                                                className={styles["layer-icon"]}
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
                                            className={styles["expand-icon"]}
                                            onClick={() => toggleExpand(config.id, parent.id)}
                                          >
                                            {expandedHazards[`${config.id}.${parent.id}`] ? (
                                              <ExpandLess />
                                            ) : (
                                              <ExpandMore />
                                            )}
                                          </IconButton>
                                        )}
                                      </Box>

                                      {parent.subLayers && parent.subLayers.length > 0 && (
                                        <Collapse in={expandedHazards[`${config.id}.${parent.id}`]}>
                                          <Stack spacing={1} sx={{ pl: 3 }}>
                                            {parent.subLayers.map((sub) => {
                                              const compositeId = `${parent.id}.${sub.id}`;
                                              const isSubVisible =
                                                visibleHazardLayerIdsByMap[config.id]?.has(
                                                  compositeId,
                                                ) ?? false;
                                              return (
                                                <FormControlLabel
                                                  sx={{
                                                    ml: 0,
                                                    "& .MuiFormControlLabel-label": {
                                                      ml: -4.2,
                                                    },
                                                  }}
                                                  key={sub.id}
                                                  control={
                                                    <Checkbox
                                                      checked={isSubVisible}
                                                      onChange={() =>
                                                        toggleSubLayerVisibility(
                                                          config.id,
                                                          parent.id,
                                                          sub.id,
                                                        )
                                                      }
                                                      size="small"
                                                    />
                                                  }
                                                  label={
                                                    <div className={styles["layer-label"]}>
                                                      <span
                                                        className={styles["layer-icon"]}
                                                        style={{
                                                          color:
                                                            sub.color ?? parent.color ?? "#666",
                                                        }}
                                                      ></span>
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

                            <Divider className={styles["section-divider"]} />

                            {/* Hazards (Rasters) */}
                            <Box
                              className={styles["section-header"]}
                              onClick={() => toggleSectionByMap(config.id, "rasters")}
                            >
                              <Typography variant="subtitle1" className={styles["section-title"]}>
                                Hazards (Rasters)
                              </Typography>
                              <IconButton size="small">
                                {expandedSectionsByMap[config.id]?.rasters ? (
                                  <ExpandLess />
                                ) : (
                                  <ExpandMore />
                                )}
                              </IconButton>
                            </Box>

                            <Collapse in={expandedSectionsByMap[config.id]?.rasters ?? false}>
                              <Stack spacing={1} className={styles["section-content"]}>
                                {rasterLayerConfigs.map((parent) => {
                                  const ParentIcon =
                                    FaIcons[parent.icon as keyof typeof FaIcons] || FaIcons.FaMap;

                                  const hasChildren = !!parent.subLayers?.length;
                                  const CHECKBOX_WIDTH = 15;
                                  const visibleRasterIdsForMap =
                                    visibleRasterLayerIdsByMap[config.id] ?? new Set<string>();
                                  const isParentVisible = visibleRasterIdsForMap.has(parent.id);

                                  return (
                                    <Box key={parent.id} className={styles["layer-toggle"]}>
                                      {/* === Parent row === */}
                                      <Box display="flex" alignItems="center">
                                        {/* Checkbox OR spacer */}
                                        <Box
                                          sx={{
                                            width: CHECKBOX_WIDTH,
                                            display: "flex",
                                            justifyContent: "center",
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
                                          className={styles["layer-label"]}
                                          sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            flexGrow: 1,
                                            ml: "21px",
                                          }}
                                        >
                                          <span
                                            className={styles["layer-icon"]}
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
                                            className={styles["expand-icon"]}
                                            onClick={() =>
                                              toggleExpandRasters(config.id, parent.id)
                                            }
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
                                              const isSubVisible =
                                                visibleRasterIdsForMap.has(compositeId);
                                              return (
                                                <FormControlLabel
                                                  sx={{
                                                    ml: 0,
                                                    "& .MuiFormControlLabel-label": {
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
                                                          sub.id,
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
                          </Box>
                        )}
                      </Box>
                    ))}
                  </Box>
                </Stack>
              </Collapse>
            </Box>

            <Divider className={styles["section-divider"]} />

            {/* Dashboard Utils Section */}
            <Box className={styles["control-section"]}>
              <Box className={styles["section-header"]} onClick={() => toggleSection("utils")}>
                <Typography variant="subtitle1" className={styles["section-title"]}>
                  Dashboard Utilities
                </Typography>
                <IconButton size="small">
                  {expandedSections.utils ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Box>

              <Collapse in={expandedSections.utils}>
                <Stack spacing={2} className={styles["section-content"]}>
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

            <Divider className={styles["section-divider"]} />
          </>
        ) : (
          <Box className={styles["collapsed-sidebar"]}>
            <Tooltip title="Map Management" placement="left">
              <Box
                className={styles["collapsed-section"]}
                onClick={() => setIsPanelCollapsed(false)}
              >
                <Layers />
              </Box>
            </Tooltip>
            <Tooltip title="Dashboard Utilities" placement="left">
              <Box
                className={styles["collapsed-section"]}
                onClick={() => setIsPanelCollapsed(false)}
              >
                <Camera />
              </Box>
            </Tooltip>
            <Tooltip title="Points of Interest" placement="left">
              <Box
                className={styles["collapsed-section"]}
                onClick={() => setIsPanelCollapsed(false)}
              >
                <LocationOn />
              </Box>
            </Tooltip>
            <Tooltip title="Hazards" placement="left">
              <Box
                className={styles["collapsed-section"]}
                onClick={() => setIsPanelCollapsed(false)}
              >
                <Warning />
              </Box>
            </Tooltip>
            <Tooltip title="Hazards (Rasters)" placement="left">
              <Box
                className={styles["collapsed-section"]}
                onClick={() => setIsPanelCollapsed(false)}
              >
                <Terrain />
              </Box>
            </Tooltip>
          </Box>
        )}
      </Paper>
    </div>
  );
};
