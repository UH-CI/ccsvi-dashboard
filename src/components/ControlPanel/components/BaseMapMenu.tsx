import React from "react";
import { Menu, MenuItem, ListSubheader } from "@mui/material";
import { MapConfig } from "../../../types";
import { BASE_MAP_OPTIONS } from "../../../config/basemaps";

interface BaseMapMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  mapId: string;
  activeBaseMapId: string;
  updateMapConfig: (mapId: string, updates: Partial<MapConfig>) => void;
}

// Base map (tile provider) picker for a single map
export const BaseMapMenu: React.FC<BaseMapMenuProps> = ({
  anchorEl,
  open,
  onClose,
  mapId,
  activeBaseMapId,
  updateMapConfig,
}) => {
  return (
    <Menu anchorEl={anchorEl} open={open} onClose={onClose}>
      <ListSubheader>Base Map</ListSubheader>
      {BASE_MAP_OPTIONS.map((opt) => (
        <MenuItem
          key={opt.id}
          selected={opt.id === activeBaseMapId}
          onClick={() => updateMapConfig(mapId, { baseMap: opt.id })}
        >
          {opt.label}
        </MenuItem>
      ))}
    </Menu>
  );
};
