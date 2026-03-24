import React, { useMemo, useCallback, useState } from "react";
import {
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Divider,
  Stack,
  Collapse,
  IconButton,
  Box,
  Menu,
  Slider,
} from "@mui/material";
import {
  ExpandMore,
  ExpandLess,
  Visibility,
  VisibilityOff,
  Close,
  Palette,
} from "@mui/icons-material";
import * as FaIcons from "react-icons/fa";
import {
  useAppStore,
  useMapStore,
  useMapConfig,
  usePointLayerStore,
  useHazardLayersStore,
  useRasterLayersStore,
  DEFAULT_LAYER_OPACITIES,
  defaultExpandedSections,
} from "../../stores";
import styles from "./ControlPanel.module.scss";

interface SingleMapControlsProps {
  mapId: string;
  canRemoveMap: boolean;
  onRemove: (mapId: string) => void;
}

export const SingleMapControls: React.FC<SingleMapControlsProps> = ({
  mapId,
  canRemoveMap,
  onRemove,
}) => {
  const config = useMapConfig(mapId);
  const dataset = useAppStore((state) => state.blockGroupData);

  const updateMapConfig = useMapStore((state) => state.updateMapConfig);
  const toggleMapVisibility = useMapStore((state) => state.toggleMapVisibility);
  const expandedSections = useMapStore(
    (state) => state.expandedSectionsByMap[mapId] ?? defaultExpandedSections,
  );
  const toggleSectionByMap = useMapStore((state) => state.toggleSectionByMap);
  const mapOpacities = useMapStore(
    (state) => state.layerOpacities[mapId] ?? DEFAULT_LAYER_OPACITIES,
  );
  const setLayerOpacity = useMapStore((state) => state.setLayerOpacity);

  const pointLayerConfigs = usePointLayerStore((state) => state.pointLayerConfigs);
  const visiblePointLayerIds = usePointLayerStore((state) => state.visibleLayerIdsByMap[mapId]);
  const togglePointLayerVisibility = usePointLayerStore((state) => state.toggleLayerVisibility);

  const hazardLayerConfigs = useHazardLayersStore((state) => state.hazardLayerConfigs);
  const visibleHazardLayerIds = useHazardLayersStore((state) => state.visibleLayerIdsByMap[mapId]);
  const toggleHazardLayerVisibility = useHazardLayersStore(
    (state) => state.toggleHazardLayerVisibility,
  );
  const toggleSubLayerVisibility = useHazardLayersStore((state) => state.toggleSubLayerVisibility);

  const rasterLayerConfigs = useRasterLayersStore((state) => state.rasterLayerConfigs);
  const visibleRasterIds = useRasterLayersStore((state) => state.visibleLayerIdsByMap[mapId]);
  const toggleRasterLayerVisibility = useRasterLayersStore((s) => s.toggleRasterLayerVisibility);
  const toggleSubRasterLayerVisibility = useRasterLayersStore(
    (s) => s.toggleSubRasterLayerVisibility,
  );

  const [colorSchemeAnchor, setColorSchemeAnchor] = useState<HTMLElement | null>(null);
  const [expandedHazards, setExpandedHazards] = useState<Record<string, boolean>>({});
  const [expandedRasters, setExpandedRasters] = useState<Record<string, boolean>>({});

  const toggleExpand = useCallback((id: string) => {
    setExpandedHazards((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const toggleExpandRaster = useCallback((id: string) => {
    setExpandedRasters((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const datasetList = useMemo(() => {
    if (!dataset) return [];
    return Object.entries(dataset).map(([key, cfg]) => ({
      id: key,
      label: cfg.metricLabel || key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      hawaiianHomelands: cfg.hawaiianHomelands || false,
    }));
  }, [dataset]);

  if (!config) return null;

  return (
    <Box className={styles["map-item"]}>
      <Box className={styles["map-item-header"]}>
        <Typography variant="body2" className={styles["map-item-title"]}>
          Map {config.id}
        </Typography>
        <Box className={styles["map-item-actions"]}>
          {config.visible && config.dataset && config.metric && (
            <>
              <IconButton
                size="small"
                onClick={(e) => setColorSchemeAnchor(e.currentTarget)}
                title="Color scheme"
              >
                <Palette fontSize="small" />
              </IconButton>
              <Menu
                anchorEl={colorSchemeAnchor}
                open={Boolean(colorSchemeAnchor)}
                onClose={() => setColorSchemeAnchor(null)}
              >
                {["viridis", "reds", "blues"].map((scheme) => (
                  <MenuItem
                    key={scheme}
                    selected={
                      config.colorScheme === scheme || (!config.colorScheme && scheme === "viridis")
                    }
                    onClick={() => {
                      updateMapConfig(config.id, {
                        colorScheme: scheme as "viridis" | "reds" | "blues",
                      });
                      setColorSchemeAnchor(null);
                    }}
                  >
                    {scheme.charAt(0).toUpperCase() + scheme.slice(1)}
                  </MenuItem>
                ))}

                <Divider />

                <Box sx={{ px: 2, py: 1.5, minWidth: 200 }}>
                  <Typography variant="caption" sx={{ fontWeight: 600, display: "block", mb: 1 }}>
                    Layer Opacity
                  </Typography>

                  {config.dataset &&
                    dataset?.[config.dataset] &&
                    !dataset[config.dataset].hawaiianHomelands && (
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" gutterBottom display="block">
                          Census Blocks
                        </Typography>
                        <Slider
                          value={mapOpacities.census}
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

                  {config.dataset && dataset?.[config.dataset]?.hawaiianHomelands && (
                    <>
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="caption" gutterBottom display="block">
                          Hawaiian Homelands
                        </Typography>
                        <Slider
                          value={mapOpacities.hawaiianHomelands}
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
                          value={mapOpacities.countyBoundaries}
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
            onClick={() => toggleMapVisibility(config.id)}
            title={config.visible ? "Hide map" : "Show map"}
          >
            {config.visible ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}
          </IconButton>
          {canRemoveMap && (
            <IconButton
              size="small"
              onClick={() => onRemove(config.id)}
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
              onChange={(e) => updateMapConfig(config.id, { dataset: e.target.value })}
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
                onChange={(e) => updateMapConfig(config.id, { metric: e.target.value })}
                label="Metric"
              >
                <MenuItem value="">
                  <em>Select Metric</em>
                </MenuItem>
                {dataset &&
                  dataset[config.dataset] &&
                  Object.keys(dataset[config.dataset].columnThresholds || {}).map((metricName) => (
                    <MenuItem key={metricName} value={metricName}>
                      {metricName}
                    </MenuItem>
                  ))}
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
              {expandedSections?.points ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>
          <Collapse in={expandedSections?.points ?? false}>
            <Stack spacing={1}>
              {pointLayerConfigs.map((layer) => {
                const IconComponent =
                  FaIcons[layer.icon as keyof typeof FaIcons] || FaIcons.FaCircle;
                const isVisible = visiblePointLayerIds?.has(layer.id) ?? false;
                return (
                  <FormControlLabel
                    key={layer.id}
                    control={
                      <Checkbox
                        checked={isVisible}
                        onChange={() => togglePointLayerVisibility(config.id, layer.id)}
                        size="small"
                      />
                    }
                    label={
                      <div className={styles["layer-label"]}>
                        <span className={styles["layer-icon"]} style={{ color: layer.color }}>
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
              {expandedSections?.hazards ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>
          <Collapse in={expandedSections?.hazards ?? false}>
            <Stack spacing={1} className={styles["section-content"]}>
              {hazardLayerConfigs.map((parent) => {
                const ParentIcon =
                  FaIcons[parent.icon as keyof typeof FaIcons] || FaIcons.FaExclamationTriangle;
                const isParentVisible = visibleHazardLayerIds?.has(parent.id) ?? false;
                return (
                  <Box key={parent.id} className={styles["layer-toggle"]}>
                    <Box display="flex" alignItems="center">
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={isParentVisible}
                            onChange={() => toggleHazardLayerVisibility(config.id, parent.id)}
                            size="small"
                          />
                        }
                        label={
                          <div className={styles["layer-label"]}>
                            <span className={styles["layer-icon"]} style={{ color: parent.color }}>
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
                          onClick={() => toggleExpand(parent.id)}
                        >
                          {expandedHazards[parent.id] ? <ExpandLess /> : <ExpandMore />}
                        </IconButton>
                      )}
                    </Box>
                    {parent.subLayers && parent.subLayers.length > 0 && (
                      <Collapse in={expandedHazards[parent.id]}>
                        <Stack spacing={1} sx={{ pl: 3 }}>
                          {parent.subLayers.map((sub) => {
                            const compositeId = `${parent.id}.${sub.id}`;
                            const isSubVisible = visibleHazardLayerIds?.has(compositeId) ?? false;
                            return (
                              <FormControlLabel
                                sx={{ ml: 0, "& .MuiFormControlLabel-label": { ml: -4.2 } }}
                                key={sub.id}
                                control={
                                  <Checkbox
                                    checked={isSubVisible}
                                    onChange={() =>
                                      toggleSubLayerVisibility(config.id, parent.id, sub.id)
                                    }
                                    size="small"
                                  />
                                }
                                label={
                                  <div className={styles["layer-label"]}>
                                    <span
                                      className={styles["layer-icon"]}
                                      style={{ color: sub.color ?? parent.color ?? "#666" }}
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
              {expandedSections?.rasters ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>
          <Collapse in={expandedSections?.rasters ?? false}>
            <Stack spacing={1} className={styles["section-content"]}>
              {rasterLayerConfigs.map((parent) => {
                const ParentIcon = FaIcons[parent.icon as keyof typeof FaIcons] || FaIcons.FaMap;
                const hasChildren = !!parent.subLayers?.length;
                const CHECKBOX_WIDTH = 15;
                const isParentVisible = visibleRasterIds?.has(parent.id) ?? false;
                return (
                  <Box key={parent.id} className={styles["layer-toggle"]}>
                    <Box display="flex" alignItems="center">
                      <Box
                        sx={{ width: CHECKBOX_WIDTH, display: "flex", justifyContent: "center" }}
                      >
                        {!hasChildren && (
                          <Checkbox
                            checked={isParentVisible}
                            onChange={() => toggleRasterLayerVisibility(config.id, parent.id)}
                            size="small"
                          />
                        )}
                      </Box>
                      <Typography
                        className={styles["layer-label"]}
                        sx={{ display: "flex", alignItems: "center", flexGrow: 1, ml: "21px" }}
                      >
                        <span className={styles["layer-icon"]} style={{ color: parent.color }}>
                          <ParentIcon size="1rem" />
                        </span>
                        {parent.name}
                      </Typography>
                      {hasChildren && (
                        <IconButton
                          size="small"
                          className={styles["expand-icon"]}
                          onClick={() => toggleExpandRaster(parent.id)}
                        >
                          {expandedRasters[parent.id] ? <ExpandLess /> : <ExpandMore />}
                        </IconButton>
                      )}
                    </Box>
                    {hasChildren && (
                      <Collapse in={expandedRasters[parent.id]}>
                        <Stack spacing={1} sx={{ pl: 3 }}>
                          {parent.subLayers!.map((sub) => {
                            const compositeId = `${parent.id}.${sub.id}`;
                            const isSubVisible = visibleRasterIds?.has(compositeId) ?? false;
                            return (
                              <FormControlLabel
                                sx={{ ml: 0, "& .MuiFormControlLabel-label": { ml: 0.9 } }}
                                key={sub.id}
                                control={
                                  <Checkbox
                                    checked={isSubVisible}
                                    onChange={() =>
                                      toggleSubRasterLayerVisibility(config.id, parent.id, sub.id)
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
  );
};
