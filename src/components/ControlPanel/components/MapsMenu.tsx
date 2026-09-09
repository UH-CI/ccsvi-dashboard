import React, { useCallback } from "react";
import { Box, Button } from "@mui/material";
import { Layers } from "@mui/icons-material";
import {
  useMapStore,
  usePointLayerStore,
  useHazardLayersStore,
  useRasterLayersStore,
} from "../../../stores";
import styles from "../ControlPanel.module.scss";
import { MenuShell } from "./MenuShell";
import { SingleMapControls } from "../SingleMapControls";

interface MapsMenuProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onInfoClick: (e: React.MouseEvent<HTMLElement>) => void;
  maxMaps: number;
}

export const MapsMenu: React.FC<MapsMenuProps> = ({
  open,
  anchorEl,
  onClose,
  onInfoClick,
  maxMaps,
}) => {
  const mapConfigs = useMapStore((s) => s.mapConfigs);
  const addMap = useMapStore((s) => s.addMap);
  const removeMap = useMapStore((s) => s.removeMap);
  const setVisiblePointLayerIds = usePointLayerStore((s) => s.setVisibleLayerIds);
  const setVisibleHazardLayerIds = useHazardLayersStore((s) => s.setVisibleLayerIds);
  const setVisibleRasterLayerIds = useRasterLayersStore((s) => s.setVisibleLayerIds);

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

  return (
    <MenuShell
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      title="Map Management"
      onInfoClick={onInfoClick}
      paperClassName={
        mapConfigs.length === 1 ? styles["menu-paper-maps-single"] : styles["menu-paper-maps-multi"]
      }
    >
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
      <Box
        className={styles["map-management-grid"]}
        sx={{
          gridTemplateColumns:
            mapConfigs.length === 1 ? "minmax(0, 1fr)" : "repeat(2, minmax(155px, 1fr))",
          justifyItems: mapConfigs.length === 1 ? "stretch" : "initial",
        }}
      >
        {mapConfigs.map((mapConfig) => (
          <Box key={mapConfig.id} className={styles["map-management-item"]}>
            <SingleMapControls
              mapId={mapConfig.id}
              canRemoveMap={canRemoveMap}
              onRemove={handleRemoveMap}
              section="management"
            />
          </Box>
        ))}
      </Box>
    </MenuShell>
  );
};
