import React, { useCallback, useState } from "react";
import { Button } from "@mui/material";
import { Layers } from "@mui/icons-material";
import {
  useMapStore,
  usePointLayerStore,
  useHazardLayersStore,
  useRasterLayersStore,
} from "../../../stores";
import styles from "../ControlPanel.module.scss";
import { MenuShell } from "./MenuShell";
import { MapTabSelector } from "./MapTabSelector";
import { SingleMapControls } from "../SingleMapControls";
import { useResolvedMapId } from "../hooks/useResolvedMapId";

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
  const primaryMapId = useMapStore((s) => s.primaryMapId);
  const addMap = useMapStore((s) => s.addMap);
  const removeMap = useMapStore((s) => s.removeMap);
  const setVisiblePointLayerIds = usePointLayerStore((s) => s.setVisibleLayerIds);
  const setVisibleHazardLayerIds = useHazardLayersStore((s) => s.setVisibleLayerIds);
  const setVisibleRasterLayerIds = useRasterLayersStore((s) => s.setVisibleLayerIds);

  const [mapsMapId, setMapsMapId] = useState<string>("");
  const resolvedMapsMapId = useResolvedMapId(mapsMapId, mapConfigs, primaryMapId);

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
      <MapTabSelector
        mapConfigs={mapConfigs}
        selectedMapId={resolvedMapsMapId}
        onChange={setMapsMapId}
      />
      {resolvedMapsMapId && (
        <SingleMapControls
          key={resolvedMapsMapId}
          mapId={resolvedMapsMapId}
          canRemoveMap={canRemoveMap}
          onRemove={handleRemoveMap}
          section="management"
        />
      )}
    </MenuShell>
  );
};
