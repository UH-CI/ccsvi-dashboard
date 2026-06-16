import React from "react";
import { Box, Checkbox, Typography, IconButton, Collapse, Stack } from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import * as FaIcons from "react-icons/fa";
import styles from "../ControlPanel.module.scss";

interface LayerToggleGroupProps {
  label: string;
  expanded: boolean;
  onToggleExpand: () => void;
  selectAll?: { checked: boolean; indeterminate: boolean; onToggle: () => void };
  icon?: string;
  color?: string;
  fallbackIcon?: keyof typeof FaIcons;
  childrenPl?: number;
  children: React.ReactNode;
}

export const LayerToggleGroup: React.FC<LayerToggleGroupProps> = ({
  label,
  expanded,
  onToggleExpand,
  selectAll,
  icon,
  color,
  fallbackIcon = "FaCircle",
  childrenPl = 3,
  children,
}) => {
  const IconComponent = (icon && FaIcons[icon as keyof typeof FaIcons]) || FaIcons[fallbackIcon];
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
          {icon && (
            <span className={styles["layer-icon"]} style={{ color }}>
              <IconComponent size="1rem" />
            </span>
          )}
          {label}
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
