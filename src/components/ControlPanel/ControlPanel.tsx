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
  FormControlLabel,
  Checkbox,
  Menu,
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
} from "@mui/icons-material";
import * as FaIcons from "react-icons/fa";
import {
  useMapStore,
  usePointLayerStore,
  usePrimaryMapState,
  useHazardLayersStore,
  useRasterLayersStore,
} from "../../stores";
import { SingleMapControls } from "./SingleMapControls";
import styles from "./ControlPanel.module.scss";

interface IntegratedControlPanelProps {
  maxMaps: number;
}

type PopoverKey = "maps" | "points" | "hazards" | "rasters" | null;

const MapTabSelector: React.FC<{
  mapConfigs: { id: string }[];
  selectedMapId: string;
  onChange: (id: string) => void;
}> = ({ mapConfigs, selectedMapId, onChange }) => {
  if (mapConfigs.length <= 1) return null;
  return (
    <Box className={styles["map-tab-selector"]}>
      {mapConfigs.map((c) => (
        <button
          key={c.id}
          className={`${styles["map-tab-btn"]} ${selectedMapId === c.id ? styles["map-tab-btn--active"] : ""}`}
          onClick={() => onChange(c.id)}
        >
          Map {c.id}
        </button>
      ))}
    </Box>
  );
};

export const ControlPanel: React.FC<IntegratedControlPanelProps> = ({ maxMaps }) => {
  const mapConfigs = useMapStore((state) => state.mapConfigs);
  const addMap = useMapStore((state) => state.addMap);
  const removeMap = useMapStore((state) => state.removeMap);
  const resetMapStore = useMapStore((state) => state.reset);
  const primaryMapId = useMapStore((state) => state.primaryMapId);

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

  // One anchor per nav button
  const [anchors, setAnchors] = useState<Partial<Record<NonNullable<PopoverKey>, HTMLElement>>>({});
  const [expandedHazards, setExpandedHazards] = useState<Record<string, boolean>>({});
  const [expandedRasters, setExpandedRasters] = useState<Record<string, boolean>>({});
  const [pointsMapId, setPointsMapId] = useState<string>("");
  const [hazardsMapId, setHazardsMapId] = useState<string>("");
  const [rastersMapId, setRastersMapId] = useState<string>("");

  const visibleMaps = useMemo(() => mapConfigs.filter((c) => c.visible), [mapConfigs]);
  const canAddMap = mapConfigs.length < maxMaps;
  const canRemoveMap = mapConfigs.length > 1;

  const openMenu = useCallback(
    (key: NonNullable<PopoverKey>, el: HTMLElement) => {
      // Close all others, open this one
      setAnchors({ [key]: el });
      if (key === "points")
        setPointsMapId((prev) => prev || primaryMapId || mapConfigs[0]?.id || "");
      if (key === "hazards")
        setHazardsMapId((prev) => prev || primaryMapId || mapConfigs[0]?.id || "");
      if (key === "rasters")
        setRastersMapId((prev) => prev || primaryMapId || mapConfigs[0]?.id || "");
    },
    [primaryMapId, mapConfigs],
  );

  const closeMenu = useCallback((key: NonNullable<PopoverKey>) => {
    setAnchors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const handleButtonClick = useCallback(
    (key: NonNullable<PopoverKey>, e: React.MouseEvent<HTMLElement>) => {
      if (anchors[key]) {
        closeMenu(key);
      } else {
        openMenu(key, e.currentTarget);
      }
    },
    [anchors, openMenu, closeMenu],
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
    setAnchors({});
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
    setAnchors({});
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedHazards((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const toggleExpandRaster = useCallback((id: string) => {
    setExpandedRasters((prev) => ({ ...prev, [id]: !prev[id] }));
  }, []);

  const navItems: { key: NonNullable<PopoverKey>; label: string; icon: React.ReactNode }[] = [
    { key: "maps", label: "Maps", icon: <Layers fontSize="small" /> },
    { key: "points", label: "Points", icon: <LocationOn fontSize="small" /> },
    { key: "hazards", label: "Hazards", icon: <Warning fontSize="small" /> },
    { key: "rasters", label: "Terrain", icon: <Terrain fontSize="small" /> },
  ];

  const menuProps = {
    anchorOrigin: { vertical: "bottom" as const, horizontal: "left" as const },
    transformOrigin: { vertical: "top" as const, horizontal: "left" as const },
    disableAutoFocus: true,
    disableEnforceFocus: true,
    disableRestoreFocus: true,
    // Keep menu open when interacting with nested MUI components
    keepMounted: false,
    PaperProps: {
      className: styles["menu-paper"],
    },
    MenuListProps: {
      className: styles["menu-list"],
    },
  };

  return (
    <Paper className={styles["top-bar"]} elevation={3}>
      {/* Brand */}
      <Box className={styles["top-bar-brand"]}>
        <Typography variant="subtitle1" className={styles["top-bar-title"]}>
          CCSVI
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
            className={`${styles["nav-btn"]} ${anchors[key] ? styles["nav-btn--active"] : ""}`}
            onClick={(e) => handleButtonClick(key, e)}
            startIcon={icon}
            endIcon={
              <ExpandMore
                fontSize="small"
                className={anchors[key] ? styles["chevron-open"] : styles["chevron"]}
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

      {/* ── Maps Menu ── */}
      <Menu
        open={Boolean(anchors.maps)}
        anchorEl={anchors.maps}
        onClose={() => closeMenu("maps")}
        {...menuProps}
      >
        <Box className={styles["menu-content"]}>
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
      </Menu>

      {/* ── Points Menu ── */}
      <Menu
        open={Boolean(anchors.points)}
        anchorEl={anchors.points}
        onClose={() => closeMenu("points")}
        {...menuProps}
      >
        <Box className={styles["menu-content"]}>
          <Typography variant="subtitle2" className={styles["popover-title"]}>
            Points of Interest
          </Typography>
          <MapTabSelector
            mapConfigs={visibleMaps}
            selectedMapId={pointsMapId}
            onChange={setPointsMapId}
          />
          {pointsMapId && (
            <Stack spacing={1}>
              {pointLayerConfigs.map((layer) => {
                const IconComponent =
                  FaIcons[layer.icon as keyof typeof FaIcons] || FaIcons.FaCircle;
                const isVisible = visiblePointLayerIdsByMap[pointsMapId]?.has(layer.id) ?? false;
                return (
                  <FormControlLabel
                    key={layer.id}
                    control={
                      <Checkbox
                        checked={isVisible}
                        onChange={() => togglePointLayerVisibility(pointsMapId, layer.id)}
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
      </Menu>

      {/* ── Hazards Menu ── */}
      <Menu
        open={Boolean(anchors.hazards)}
        anchorEl={anchors.hazards}
        onClose={() => closeMenu("hazards")}
        {...menuProps}
      >
        <Box className={styles["menu-content"]}>
          <Typography variant="subtitle2" className={styles["popover-title"]}>
            Hazard Layers
          </Typography>
          <MapTabSelector
            mapConfigs={visibleMaps}
            selectedMapId={hazardsMapId}
            onChange={setHazardsMapId}
          />
          {hazardsMapId && (
            <Stack spacing={1}>
              {hazardLayerConfigs.map((parent) => {
                const ParentIcon =
                  FaIcons[parent.icon as keyof typeof FaIcons] || FaIcons.FaExclamationTriangle;
                const isParentVisible =
                  visibleHazardLayerIdsByMap[hazardsMapId]?.has(parent.id) ?? false;
                return (
                  <Box key={parent.id} className={styles["layer-toggle"]}>
                    <Box display="flex" alignItems="center">
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={isParentVisible}
                            onChange={() => toggleHazardLayerVisibility(hazardsMapId, parent.id)}
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
                              visibleHazardLayerIdsByMap[hazardsMapId]?.has(compositeId) ?? false;
                            return (
                              <FormControlLabel
                                key={sub.id}
                                sx={{ ml: 0, "& .MuiFormControlLabel-label": { ml: -4.2 } }}
                                control={
                                  <Checkbox
                                    checked={isSubVisible}
                                    onChange={() =>
                                      toggleSubLayerVisibility(hazardsMapId, parent.id, sub.id)
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
      </Menu>

      {/* ── Terrain Menu ── */}
      <Menu
        open={Boolean(anchors.rasters)}
        anchorEl={anchors.rasters}
        onClose={() => closeMenu("rasters")}
        {...menuProps}
      >
        <Box className={styles["menu-content"]}>
          <Typography variant="subtitle2" className={styles["popover-title"]}>
            Terrain / Rasters
          </Typography>
          <MapTabSelector
            mapConfigs={visibleMaps}
            selectedMapId={rastersMapId}
            onChange={setRastersMapId}
          />
          {rastersMapId && (
            <Stack spacing={1}>
              {rasterLayerConfigs.map((parent) => {
                const ParentIcon = FaIcons[parent.icon as keyof typeof FaIcons] || FaIcons.FaMap;
                const hasChildren = !!parent.subLayers?.length;
                const visibleRasterIdsForMap =
                  visibleRasterLayerIdsByMap[rastersMapId] ?? new Set<string>();
                const isParentVisible = visibleRasterIdsForMap.has(parent.id);
                return (
                  <Box key={parent.id} className={styles["layer-toggle"]}>
                    <Box display="flex" alignItems="center">
                      {!hasChildren && (
                        <Checkbox
                          checked={isParentVisible}
                          onChange={() => toggleRasterLayerVisibility(rastersMapId, parent.id)}
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
                                        rastersMapId,
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
      </Menu>
    </Paper>
  );
};
