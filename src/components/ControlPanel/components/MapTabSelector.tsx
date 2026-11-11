import React from "react";
import { Box } from "@mui/material";
import styles from "../ControlPanel.module.scss";

interface MapTabSelectorProps {
  maps: { id: string; title?: string }[];
  selectedMapId: string;
  onChange: (id: string) => void;
}

// Per-menu tab strip for picking which map a menu's settings apply to.
export const MapTabSelector: React.FC<MapTabSelectorProps> = ({
  maps,
  selectedMapId,
  onChange,
}) => {
  if (maps.length <= 1) return null;
  return (
    <Box className={styles["map-tab-selector"]}>
      {maps.map((c) => (
        <button
          key={c.id}
          className={`${styles["map-tab-btn"]} ${selectedMapId === c.id ? styles["map-tab-btn--active"] : ""}`}
          onClick={() => onChange(c.id)}
        >
          {c.title ?? `Map ${c.id}`}
        </button>
      ))}
    </Box>
  );
};
