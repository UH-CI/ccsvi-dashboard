import React from "react";
import { Button } from "@mui/material";
import { Layers } from "@mui/icons-material";
import { useMapStore } from "../../../stores/useMapStore";
import { MAX_MAPS } from "../../../config/map";
import styles from "../ControlPanel.module.scss";
import { MenuShell, type MenuProps } from "./MenuShell";
import { MapTabSelector } from "./MapTabSelector";
import { useMenuMap } from "../useMenuMap";
import { SingleMapControls } from "../SingleMapControls";

// Every map, shown or hidden, so a hidden map can be shown again
export const MapsMenu: React.FC<MenuProps> = (props) => {
  const maps = useMapStore((s) => s.maps);
  const addMap = useMapStore((s) => s.addMap);
  const removeMap = useMapStore((s) => s.removeMap);

  const canAddMap = maps.length < MAX_MAPS;
  const canRemoveMap = maps.length > 1;
  const [resolvedMapsMapId, setMapsMapId] = useMenuMap(maps);

  return (
    <MenuShell {...props}>
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
