import React, { useState } from "react";
import { Button } from "@mui/material";
import { Layers } from "@mui/icons-material";
import { useMapStore } from "../../../stores";
import { MAX_MAPS } from "../../../config";
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
}

export const MapsMenu: React.FC<MapsMenuProps> = ({ open, anchorEl, onClose, onInfoClick }) => {
  const mapConfigs = useMapStore((s) => s.mapConfigs);
  const primaryMapId = useMapStore((s) => s.primaryMapId);
  const addMap = useMapStore((s) => s.addMap);
  const removeMap = useMapStore((s) => s.removeMap);

  const canAddMap = mapConfigs.length < MAX_MAPS;
  const canRemoveMap = mapConfigs.length > 1;
  const [mapsMapId, setMapsMapId] = useState<string>("");
  const resolvedMapsMapId = useResolvedMapId(mapsMapId, mapConfigs, primaryMapId);

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
          mapId={resolvedMapsMapId}
          canRemoveMap={canRemoveMap}
          onRemove={removeMap}
        />
      )}
    </MenuShell>
  );
};
