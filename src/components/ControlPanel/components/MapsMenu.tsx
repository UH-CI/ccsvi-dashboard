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
  const maps = useMapStore((s) => s.maps);
  const primaryMapId = useMapStore((s) => s.primaryMapId);
  const addMap = useMapStore((s) => s.addMap);
  const removeMap = useMapStore((s) => s.removeMap);

  const canAddMap = maps.length < MAX_MAPS;
  const canRemoveMap = maps.length > 1;
  const [mapsMapId, setMapsMapId] = useState<string>("");
  const resolvedMapsMapId = useResolvedMapId(mapsMapId, maps, primaryMapId);

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
      <MapTabSelector maps={maps} selectedMapId={resolvedMapsMapId} onChange={setMapsMapId} />
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
