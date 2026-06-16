import React from "react";
import { Box } from "@mui/material";
import styles from "../ControlPanel.module.scss";

interface MapTabSelectorProps {
  mapConfigs: { id: string; title?: string }[];
  selectedMapId: string;
  onChange: (id: string) => void;
}

// Per-menu tab strip for picking which map a menu's settings apply to.
export const MapTabSelector: React.FC<MapTabSelectorProps> = ({
  mapConfigs,
  selectedMapId,
  onChange,
}) => {
  if (mapConfigs.length <= 1) return null;
  return (
    <Box className={styles["map-tab-selector"]}>
      {mapConfigs.map((c) => (
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
