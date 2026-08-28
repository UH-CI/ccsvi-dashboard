import React from "react";
import { FormControlLabel, Checkbox, Box } from "@mui/material";
import * as FaIcons from "react-icons/fa";
import styles from "../ControlPanel.module.scss";

interface LayerToggleItemProps {
  label: string;
  checked: boolean;
  onToggle: () => void;
  indeterminate?: boolean;
  icon?: string;
  color?: string;
  fallbackIcon?: keyof typeof FaIcons;
  indented?: boolean;
  labelMl?: number;
  description?: string; // optional hover text
  hideCheckbox?: boolean; // hide the checkbox
}

// Leaf layer toggle: checkbox + optional colored FA icon + label.
export const LayerToggleItem: React.FC<LayerToggleItemProps> = ({
  label,
  checked,
  onToggle,
  indeterminate,
  icon,
  color,
  fallbackIcon = "FaCircle",
  indented = false,
  labelMl = 0.9,
  description,
  hideCheckbox = false,
}) => {
  const IconComponent = (icon && FaIcons[icon as keyof typeof FaIcons]) || FaIcons[fallbackIcon];
  const labelNode = icon ? (
    <Box className={styles["layer-label"]}>
      <span className={styles["layer-icon"]} style={{ color }}>
        <IconComponent size="1rem" />
      </span>
      {label}
    </Box>
  ) : (
    <span>{label}</span>
  );

  if (hideCheckbox) {
    return (
      <Box
        sx={
          indented
            ? { ml: 0, pl: 4.5 }
            : undefined
        }
      >
        {labelNode}
      </Box>
    );
  }

  return (
    <FormControlLabel
      sx={indented ? { ml: 0, "& .MuiFormControlLabel-label": { ml: labelMl } } : undefined}
      control={
        <Checkbox
          checked={checked}
          indeterminate={indeterminate}
          onChange={onToggle}
          size="small"
        />
      }
      label={labelNode}
    />
  );
};
