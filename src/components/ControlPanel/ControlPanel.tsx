import React, { useMemo, useCallback, useState } from "react";
import {
  Typography,
  Button,
  Paper,
  Divider,
  Stack,
  Collapse,
  IconButton,
  Box,
  Chip,
  Tooltip,
  Popover,
  FormControlLabel,
  Checkbox,
  Menu,
  MenuItem,
  Slider,
} from "@mui/material";
import {
  Camera,
  Layers,
  LocationOn,
  Warning,
  Refresh,
  Terrain,
  ExpandMore,
  ExpandLess,
  Palette,
} from "@mui/icons-material";
import * as FaIcons from "react-icons/fa";
import {
  useMapStore,
  usePointLayerStore,
  usePrimaryMapState,
  useHazardLayersStore,
  useRasterLayersStore,
  useAppStore,
  DEFAULT_LAYER_OPACITIES,
} from "../../stores";
import { SingleMapControls } from "./SingleMapControls";
import styles from "./ControlPanel.module.scss";

interface IntegratedControlPanelProps {
  maxMaps: number;
}

type PopoverKey = "maps" | "points" | "hazards" | "rasters" | null;

export const ControlPanel: React.FC<IntegratedControlPanelProps> = ({ maxMaps }) => {
  const mapConfigs = useMapStore((state) => state.mapConfigs);
  const addMap = useMapStore((state) => state.addMap);
  const removeMap = useMapStore((state) => state.removeMap);
  const resetMapStore = useMapStore((state) => state.reset);
  const primaryMapId = useMapStore((state) => state.primaryMapId);
  const layerOpacities = useMapStore((state) => state.layerOpacities);
  const setLayerOpacity = useMapStore((state) => state.setLayerOpacity);
  const updateMapConfig = useMapStore((state) => state.updateMapConfig);

  const dataset = useAppStore((state) => state.blockGroupData);

  const { setDataset, setMetric } = usePrimaryMapState();

  const setVisiblePointLayerIds = usePointLayerStore((state) => state.setVisibleLayerIds);
  const setVisibleHazardLayerIds = useHazardLayersStore((state) => state.setVisibleLayerIds);
  const setVisibleRasterLayerIds = useRasterLayersStore((s) => s.setVisibleLayerIds);

  const pointLayerConfigs = usePointLayerStore((state) => state.pointLayerConfigs);
  const visiblePointLayerIdsByMap = usePointLayerStore((state) => state.visibleLayerIdsByMap);
  const togglePointLayerVisibility = usePointLayerStore((state) => state.toggleLayerVisibility);

  const hazardLayerConfigs = useHazardLayersStore((state) => state.hazardLayerConfigs);
  const visibleHazardLayerIdsByMap = useHazardLayersStore((state) => state.visibleLayerIdsByMap);
  const toggleHazardLayerVisibility = useHazardLayersStore(
    (state) => state.toggleHazardLayerVisibility,
  );
  const toggleSubLayerVisibility = useHazardLayersStore((state) => state.toggleSubLayerVisibility);

  const rasterLayerConfigs = useRasterLayersStore((state) => state.rasterLayerConfigs);
  const visibleRasterLayerIdsByMap = useRasterLayersStore((state) => state.visibleLayerIdsByMap);
  const toggleRasterLayerVisibility = useRasterLayersStore((s) => s.toggleRasterLayerVisibility);
  const toggleSubRasterLayerVisibility = useRasterLayersStore(
    (s) => s.toggleSubRasterLayerVisibility,
  );

  const [activePopover, setActivePopover] = useState<PopoverKey>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [expandedHazards, setExpandedHazards] = useState<Record<string, boolean>>({});
  const [expandedRasters, setExpandedRasters] = useState<Record<string, boolean>>({});
  const [colorSchemeAnchor, setColorSchemeAnchor] = useState<HTMLElement | null>(null);

  const visibleMaps = useMemo(() => mapConfigs.filter((config) => config.visible), [mapConfigs]);
  const canAddMap = mapConfigs.length < maxMaps;
  const canRemoveMap = mapConfigs.length > 1;

  // Use primary map for layer controls
  const primaryConfig = useMemo(
    () => mapConfigs.find((c) => c.id === primaryMapId),
    [mapConfigs, primaryMapId],
  );

  const openPopover = useCallback((key: PopoverKey, el: HTMLElement) => {
    setActivePopover(key);
    setAnchorEl(el);
  }, []);

  const closePopover = useCallback(() => {
    setActivePopover(null);
    setAnchorEl(null);
  }, []);

  const handleButtonClick = useCallback(
    (key: PopoverKey, e: React.MouseEvent<HTMLElement>) => {
      if (activePopover === key) {
        closePopover();
      } else {
        openPopover(key, e.currentTarget);
      }
    },
    [activePopover, openPopover, closePopover],
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
    closePopover();
  }, [
    resetMapStore,
    setDataset,
    setMetric,
    setVisiblePointLayerIds,
    setVisibleHazardLayerIds,
    setVisibleRasterLayerIds,
    mapConfigs,
    closePopover,
  ]);

  const handleSnapshot = useCallback(() => {
    console.log("Snapshot");
    closePopover();
  }, [closePopover]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedHazards((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const toggleExpandRaster = useCallback((id: string) => {
    setExpandedRasters((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const navItems: { key: PopoverKey; label: string; icon: React.ReactNode }[] = [
    { key: "maps", label: "Maps", icon: <Layers fontSize="small" /> },
    { key: "points", label: "Points", icon: <LocationOn fontSize="small" /> },
    { key: "hazards", label: "Hazards", icon: <Warning fontSize="small" /> },
    { key: "rasters", label: "Terrain", icon: <Terrain fontSize="small" /> },
  ];

  const popoverAnchorProps = {
    anchorOrigin: { vertical: "bottom" as const, horizontal: "left" as const },
    transformOrigin: { vertical: "top" as const, horizontal: "left" as const },
    classes: { paper: styles["popover-paper"] },
  };

  return (
    <Paper className={styles["top-bar"]} elevation={3}>
      {/* Brand */}
      <Box className={styles["top-bar-brand"]}>
        <Typography variant="subtitle1" className={styles["top-bar-title"]}>
          Multi-Map
        </Typography>
        <Chip
          label={`${visibleMaps.length}/${mapConfigs.length}`}
          size="small"
          color="primary"
          className={styles["map-count-chip"]}
        />
      </Box>

      <Divider orientation="vertical" flexItem className={styles["bar-divider"]} />

      {/* Nav Buttons */}
      <Box className={styles["top-bar-nav"]}>
        {navItems.map(({ key, label, icon }) => (
          <Button
            key={key}
            className={`${styles["nav-btn"]} ${activePopover === key ? styles["nav-btn--active"] : ""}`}
            onClick={(e) => handleButtonClick(key, e)}
            startIcon={icon}
            endIcon={
              <ExpandMore
                fontSize="small"
                className={activePopover === key ? styles["chevron-open"] : styles["chevron"]}
              />
            }
            size="small"
          >
            {label}
          </Button>
        ))}
      </Box>

      <Divider orientation="vertical" flexItem className={styles["bar-divider"]} />

      {/* Utility Actions */}
      <Box className={styles["top-bar-actions"]}>
        <Tooltip title="Take Snapshot">
          <Button
            onClick={handleSnapshot}
            variant="contained"
            startIcon={<Camera fontSize="small" />}
            size="small"
            className={styles["action-btn"]}
          >
            Snapshot
          </Button>
        </Tooltip>
        <Tooltip title="Reset View">
          <IconButton onClick={handleResetView} size="small" className={styles["reset-btn"]}>
            <Refresh fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* ── Maps Popover ── */}
      <Popover
        open={activePopover === "maps"}
        anchorEl={anchorEl}
        onClose={closePopover}
        {...popoverAnchorProps}
      >
        <Box className={styles["popover-content"]}>
          <Typography variant="subtitle2" className={styles["popover-title"]}>
            Map Management
          </Typography>
          {canAddMap && (
            <Button
              variant="outlined"
              size="small"
              onClick={addMap}
              startIcon={<Layers />}
              fullWidth
              className={styles["popover-add-btn"]}
            >
              Add Map
            </Button>
          )}
          <Stack spacing={1} className={styles["map-list"]}>
            {mapConfigs.map((config) => (
              <SingleMapControls
                key={config.id}
                mapId={config.id}
                canRemoveMap={canRemoveMap}
                onRemove={handleRemoveMap}
              />
            ))}
          </Stack>
        </Box>
      </Popover>

      {/* ── Points Popover ── */}
      <Popover
        open={activePopover === "points"}
        anchorEl={anchorEl}
        onClose={closePopover}
        {...popoverAnchorProps}
      >
        <Box className={styles["popover-content"]}>
          <Typography variant="subtitle2" className={styles["popover-title"]}>
            Points of Interest
          </Typography>
          {primaryMapId && (
            <Stack spacing={1}>
              {pointLayerConfigs.map((layer) => {
                const IconComponent =
                  FaIcons[layer.icon as keyof typeof FaIcons] || FaIcons.FaCircle;
                const isVisible = visiblePointLayerIdsByMap[primaryMapId]?.has(layer.id) ?? false;
                return (
                  <FormControlLabel
                    key={layer.id}
                    control={
                      <Checkbox
                        checked={isVisible}
                        onChange={() => togglePointLayerVisibility(primaryMapId, layer.id)}
                        size="small"
                      />
                    }
                    label={
                      <Box className={styles["layer-label"]}>
                        <span className={styles["layer-icon"]} style={{ color: layer.color }}>
                          <IconComponent size="1rem" />
                        </span>
                        {layer.name}
                      </Box>
                    }
                  />
                );
              })}
            </Stack>
          )}
        </Box>
      </Popover>

      {/* ── Hazards Popover ── */}
      <Popover
        open={activePopover === "hazards"}
        anchorEl={anchorEl}
        onClose={closePopover}
        {...popoverAnchorProps}
      >
        <Box className={styles["popover-content"]}>
          <Typography variant="subtitle2" className={styles["popover-title"]}>
            Hazard Layers
          </Typography>
          {primaryMapId && (
            <Stack spacing={1}>
              {hazardLayerConfigs.map((parent) => {
                const ParentIcon =
                  FaIcons[parent.icon as keyof typeof FaIcons] || FaIcons.FaExclamationTriangle;
                const isParentVisible =
                  visibleHazardLayerIdsByMap[primaryMapId]?.has(parent.id) ?? false;
                return (
                  <Box key={parent.id} className={styles["layer-toggle"]}>
                    <Box display="flex" alignItems="center">
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={isParentVisible}
                            onChange={() => toggleHazardLayerVisibility(primaryMapId, parent.id)}
                            size="small"
                          />
                        }
                        label={
                          <Box className={styles["layer-label"]}>
                            <span className={styles["layer-icon"]} style={{ color: parent.color }}>
                              <ParentIcon size="1rem" />
                            </span>
                            {parent.name}
                          </Box>
                        }
                      />
                      {(parent.subLayers ?? []).length > 0 && (
                        <IconButton size="small" onClick={() => toggleExpand(parent.id)}>
                          {expandedHazards[parent.id] ? <ExpandLess /> : <ExpandMore />}
                        </IconButton>
                      )}
                    </Box>
                    {parent.subLayers && parent.subLayers.length > 0 && (
                      <Collapse in={expandedHazards[parent.id]}>
                        <Stack spacing={1} sx={{ pl: 3 }}>
                          {parent.subLayers.map((sub) => {
                            const compositeId = `${parent.id}.${sub.id}`;
                            const isSubVisible =
                              visibleHazardLayerIdsByMap[primaryMapId]?.has(compositeId) ?? false;
                            return (
                              <FormControlLabel
                                key={sub.id}
                                sx={{ ml: 0, "& .MuiFormControlLabel-label": { ml: -4.2 } }}
                                control={
                                  <Checkbox
                                    checked={isSubVisible}
                                    onChange={() =>
                                      toggleSubLayerVisibility(primaryMapId, parent.id, sub.id)
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
          )}
        </Box>
      </Popover>

      {/* ── Terrain / Rasters Popover ── */}
      <Popover
        open={activePopover === "rasters"}
        anchorEl={anchorEl}
        onClose={closePopover}
        {...popoverAnchorProps}
      >
        <Box className={styles["popover-content"]}>
          <Typography variant="subtitle2" className={styles["popover-title"]}>
            Terrain / Rasters
          </Typography>
          {primaryMapId && (
            <Stack spacing={1}>
              {rasterLayerConfigs.map((parent) => {
                const ParentIcon = FaIcons[parent.icon as keyof typeof FaIcons] || FaIcons.FaMap;
                const hasChildren = !!parent.subLayers?.length;
                const visibleRasterIdsForMap =
                  visibleRasterLayerIdsByMap[primaryMapId] ?? new Set<string>();
                const isParentVisible = visibleRasterIdsForMap.has(parent.id);
                return (
                  <Box key={parent.id} className={styles["layer-toggle"]}>
                    <Box display="flex" alignItems="center">
                      {!hasChildren && (
                        <Checkbox
                          checked={isParentVisible}
                          onChange={() => toggleRasterLayerVisibility(primaryMapId, parent.id)}
                          size="small"
                        />
                      )}
                      <Typography
                        className={styles["layer-label"]}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          flexGrow: 1,
                          ml: hasChildren ? "21px" : 0,
                        }}
                      >
                        <span className={styles["layer-icon"]} style={{ color: parent.color }}>
                          <ParentIcon size="1rem" />
                        </span>
                        {parent.name}
                      </Typography>
                      {hasChildren && (
                        <IconButton size="small" onClick={() => toggleExpandRaster(parent.id)}>
                          {expandedRasters[parent.id] ? <ExpandLess /> : <ExpandMore />}
                        </IconButton>
                      )}
                    </Box>
                    {hasChildren && (
                      <Collapse in={expandedRasters[parent.id]}>
                        <Stack spacing={1} sx={{ pl: 3 }}>
                          {parent.subLayers!.map((sub) => {
                            const compositeId = `${parent.id}.${sub.id}`;
                            const isSubVisible = visibleRasterIdsForMap.has(compositeId);
                            return (
                              <FormControlLabel
                                key={sub.id}
                                sx={{ ml: 0, "& .MuiFormControlLabel-label": { ml: 0.9 } }}
                                control={
                                  <Checkbox
                                    checked={isSubVisible}
                                    onChange={() =>
                                      toggleSubRasterLayerVisibility(
                                        primaryMapId,
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
          )}
        </Box>
      </Popover>
    </Paper>
  );
};
