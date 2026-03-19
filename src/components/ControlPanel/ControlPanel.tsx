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
} from "@mui/material";
import {
  Camera,
  Layers,
  LocationOn,
  Warning,
  Refresh,
  Terrain,
  ExpandMore,
} from "@mui/icons-material";
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

type PopoverKey = "maps" | "utils" | "points" | "hazards" | "rasters" | null;

export const ControlPanel: React.FC<IntegratedControlPanelProps> = ({ maxMaps }) => {
  const mapConfigs = useMapStore((state) => state.mapConfigs);
  const addMap = useMapStore((state) => state.addMap);
  const removeMap = useMapStore((state) => state.removeMap);
  const resetMapStore = useMapStore((state) => state.reset);

  const { setDataset, setMetric } = usePrimaryMapState();

  const setVisiblePointLayerIds = usePointLayerStore((state) => state.setVisibleLayerIds);
  const setVisibleHazardLayerIds = useHazardLayersStore((state) => state.setVisibleLayerIds);
  const setVisibleRasterLayerIds = useRasterLayersStore((s) => s.setVisibleLayerIds);

  const [activePopover, setActivePopover] = useState<PopoverKey>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const visibleMaps = useMemo(() => mapConfigs.filter((config) => config.visible), [mapConfigs]);
  const canAddMap = mapConfigs.length < maxMaps;
  const canRemoveMap = mapConfigs.length > 1;

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

  const navItems: { key: PopoverKey; label: string; icon: React.ReactNode }[] = [
    { key: "maps", label: "Maps", icon: <Layers fontSize="small" /> },
    { key: "points", label: "Points", icon: <LocationOn fontSize="small" /> },
    { key: "hazards", label: "Hazards", icon: <Warning fontSize="small" /> },
    { key: "rasters", label: "Terrain", icon: <Terrain fontSize="small" /> },
  ];

  return (
    <Paper className={styles["top-bar"]} elevation={3}>
      {/* Brand / Title */}
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

      {/* Maps Popover */}
      <Popover
        open={activePopover === "maps"}
        anchorEl={anchorEl}
        onClose={closePopover}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        classes={{ paper: styles["popover-paper"] }}
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

      {/* Points Popover */}
      <Popover
        open={activePopover === "points"}
        anchorEl={anchorEl}
        onClose={closePopover}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        classes={{ paper: styles["popover-paper"] }}
      >
        <Box className={styles["popover-content"]}>
          <Typography variant="subtitle2" className={styles["popover-title"]}>
            Points of Interest
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Point layer controls go here.
          </Typography>
        </Box>
      </Popover>

      {/* Hazards Popover */}
      <Popover
        open={activePopover === "hazards"}
        anchorEl={anchorEl}
        onClose={closePopover}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        classes={{ paper: styles["popover-paper"] }}
      >
        <Box className={styles["popover-content"]}>
          <Typography variant="subtitle2" className={styles["popover-title"]}>
            Hazard Layers
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Hazard layer controls go here.
          </Typography>
        </Box>
      </Popover>

      {/* Rasters Popover */}
      <Popover
        open={activePopover === "rasters"}
        anchorEl={anchorEl}
        onClose={closePopover}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        classes={{ paper: styles["popover-paper"] }}
      >
        <Box className={styles["popover-content"]}>
          <Typography variant="subtitle2" className={styles["popover-title"]}>
            Terrain / Rasters
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Raster layer controls go here.
          </Typography>
        </Box>
      </Popover>
    </Paper>
  );
};
