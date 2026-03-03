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
} from "@mui/material";
import {
  Camera,
  ExpandMore,
  ExpandLess,
  Layers,
  ChevronLeft,
  ChevronRight,
  LocationOn,
  Warning,
  Refresh,
  Terrain,
} from "@mui/icons-material";
import {
  useMapStore,
  usePointLayerStore,
  useHazardLayersStore,
  useRasterLayersStore,
} from "../../stores";
import { SingleMapControls } from "./SingleMapControls";
import styles from "./ControlPanel.module.scss";

interface IntegratedControlPanelProps {
  maxMaps: number;
}

export const ControlPanel: React.FC<IntegratedControlPanelProps> = ({ maxMaps }) => {
  const mapConfigs = useMapStore((state) => state.mapConfigs);
  const addMap = useMapStore((state) => state.addMap);
  const removeMap = useMapStore((state) => state.removeMap);
  const expandedSections = useMapStore((state) => state.expandedSections);
  const toggleSection = useMapStore((state) => state.toggleSection);
  const resetMapStore = useMapStore((state) => state.reset);

  const setVisiblePointLayerIds = usePointLayerStore((state) => state.setVisibleLayerIds);
  const setVisibleHazardLayerIds = useHazardLayersStore((state) => state.setVisibleLayerIds);
  const setVisibleRasterLayerIds = useRasterLayersStore((s) => s.setVisibleLayerIds);

  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);
  const togglePanelCollapse = useCallback(() => setIsPanelCollapsed((prev) => !prev), []);

  const visibleMaps = useMemo(() => mapConfigs.filter((config) => config.visible), [mapConfigs]);
  const canAddMap = mapConfigs.length < maxMaps;
  const canRemoveMap = mapConfigs.length > 1;

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
    mapConfigs.forEach((map) => {
      setVisiblePointLayerIds(map.id, []);
      setVisibleHazardLayerIds(map.id, []);
      setVisibleRasterLayerIds(map.id, []);
    });
  }, [
    resetMapStore,
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
                  {canAddMap && (
                    <Box className={styles["map-actions"]}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={addMap}
                        startIcon={<Layers />}
                      >
                        Add Map
                      </Button>
                    </Box>
                  )}
                  <Box className={styles["map-list"]}>
                    {mapConfigs.map((config) => (
                      <SingleMapControls
                        key={config.id}
                        mapId={config.id}
                        canRemoveMap={canRemoveMap}
                        onRemove={handleRemoveMap}
                      />
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
                    onClick={handleSnapshot}
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
