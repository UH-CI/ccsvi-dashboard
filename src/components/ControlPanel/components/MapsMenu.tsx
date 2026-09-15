import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  const [activeMapId, setActiveMapId] = useState<string>(mapConfigs[0]?.id ?? "");

  useEffect(() => {
    if (!mapConfigs.some((map) => map.id === activeMapId)) {
      setActiveMapId(mapConfigs[0]?.id ?? "");
    }
  }, [mapConfigs, activeMapId]);

  const activeMapConfig = useMemo(
    () => mapConfigs.find((map) => map.id === activeMapId) ?? mapConfigs[0],
    [mapConfigs, activeMapId],
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
      <Box className={styles["map-tab-selector"]}>
        {mapConfigs.map((mapConfig) => (
          <button
            key={mapConfig.id}
            type="button"
            className={`${styles["map-tab-btn"]} ${
              activeMapConfig?.id === mapConfig.id ? styles["map-tab-btn--active"] : ""
            }`}
            onClick={() => setActiveMapId(mapConfig.id)}
          >
            {mapConfig.title}
          </button>
        ))}
      </Box>
      {activeMapConfig && (
        <SingleMapControls
          mapId={activeMapConfig.id}
          canRemoveMap={canRemoveMap}
          onRemove={handleRemoveMap}
          section="management"
        />
      )}
    </MenuShell>
  );
};
