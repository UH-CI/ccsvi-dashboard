import React from "react";
import { Box, Checkbox, Typography, IconButton, Collapse, Stack } from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import * as FaIcons from "react-icons/fa";
import styles from "../ControlPanel.module.scss";

interface LayerToggleGroupProps {
  label: string;
  expanded: boolean;
  onToggleExpand: () => void;
  description?: string; // optional hover text for the group header
  selectAll?: { checked: boolean; indeterminate: boolean; onToggle: () => void };
  icon?: string;
  color?: string;
  fallbackIcon?: keyof typeof FaIcons;
  childrenPl?: number;
  children: React.ReactNode;
}

export function defaultLayerGroupIcon(label: string): keyof typeof FaIcons | undefined {
  if (label === "Sea Level Rise") return "FaArrowUp";
  return undefined;
}

export const LayerToggleGroup: React.FC<LayerToggleGroupProps> = ({
  label,
  expanded,
  onToggleExpand,
  description,
  selectAll,
  icon,
  color,
  fallbackIcon = "FaCircle",
  childrenPl = 3,
  children,
}) => {
  const resolvedIcon = icon ?? defaultLayerGroupIcon(label);
  const IconComponent = (resolvedIcon && FaIcons[resolvedIcon as keyof typeof FaIcons]) || FaIcons[fallbackIcon];
  return (
    <Box className={styles["layer-toggle"]}>
      <Box display="flex" alignItems="center">
        {selectAll && (
          <Checkbox
            checked={selectAll.checked}
            indeterminate={selectAll.indeterminate}
            onChange={selectAll.onToggle}
            size="small"
          />
        )}
        <Typography
          className={`${styles["layer-label"]}${!selectAll ? ` ${styles["layer-label--no-checkbox"]}` : ""}`}
        >
          {resolvedIcon && (
            <span className={styles["layer-icon"]} style={{ color }}>
              <IconComponent size="1rem" />
            </span>
          )}
          <span>{label}</span>
        </Typography>
        <IconButton size="small" onClick={onToggleExpand}>
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>
      <Collapse in={expanded}>
        <Stack spacing={1} style={{ paddingLeft: childrenPl * 8 }}>
          {children}
        </Stack>
      </Collapse>
    </Box>
  );
};
