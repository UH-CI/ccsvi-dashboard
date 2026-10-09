import React from "react";
import { Box, Checkbox, Typography, IconButton, Collapse, Stack, Tooltip } from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import * as FaIcons from "react-icons/fa";
import styles from "../ControlPanel.module.scss";

interface LayerToggleGroupProps {
  label: string;
  expanded: boolean;
  onToggleExpand: () => void;
  description?: string; // optional hover text for the group header
  selectAll?: { checked: boolean; indeterminate: boolean; onToggle: () => void };
  hideCheckbox?: boolean;
  icon?: string;
  color?: string;
  fallbackIcon?: keyof typeof FaIcons;
  childrenPl?: number;
  className?: string;
  children: React.ReactNode;
}

export const LayerToggleGroup: React.FC<LayerToggleGroupProps> = ({
  label,
  expanded,
  onToggleExpand,
  description,
  selectAll,
  hideCheckbox = false,
  icon,
  color,
  fallbackIcon = "FaCircle",
  childrenPl = 3,
  className,
  children,
}) => {
  const IconComponent = (icon && FaIcons[icon as keyof typeof FaIcons]) || FaIcons[fallbackIcon];
  return (
    //combine base class w/ optional className
    <Box className={[styles["layer-toggle"], className].filter(Boolean).join(" ")}>
      <Box display="flex" alignItems="center">
        {selectAll && (
          <Checkbox
            checked={selectAll.checked}
            indeterminate={selectAll.indeterminate}
            onChange={selectAll.onToggle}
            size="small"
            sx={hideCheckbox ? { opacity: 0 } : undefined}
          />
        )}
        {description ? (
          <Tooltip title={description} placement="right">
            <Typography
              className={`${styles["layer-label"]}${!selectAll ? ` ${styles["layer-label--no-checkbox"]}` : ""}`}
              onClick={hideCheckbox ? selectAll?.onToggle : undefined}
              sx={hideCheckbox ? { cursor: "pointer" } : undefined}
            >
              {icon && (
                <span className={styles["layer-icon"]} style={{ color }}>
                  <IconComponent size="1rem" />
                </span>
              )}
              <span>{label}</span>
            </Typography>
          </Tooltip>
        ) : (
          <Typography
            className={`${styles["layer-label"]}${!selectAll ? ` ${styles["layer-label--no-checkbox"]}` : ""}`}
            onClick={hideCheckbox ? selectAll?.onToggle : undefined}
            sx={hideCheckbox ? { cursor: "pointer" } : undefined}
          >
            {icon && (
              <span className={styles["layer-icon"]} style={{ color }}>
                <IconComponent size="1rem" />
              </span>
            )}
            <span>{label}</span>
          </Typography>
        )}
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
