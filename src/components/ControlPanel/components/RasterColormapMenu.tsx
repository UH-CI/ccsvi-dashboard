import React from "react";
import { Menu, MenuItem, ListSubheader } from "@mui/material";
import { RASTER_COLORMAPS } from "../../../config/colorSchemes";

interface RasterColormapMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  mapId: string;
  rasterId: string;
  colormap: string;
  setRasterColormap: (mapId: string, rasterId: string, colormapName: string) => void;
}

// Colormap picker for the map's saved raster
export const RasterColormapMenu: React.FC<RasterColormapMenuProps> = ({
  anchorEl,
  open,
  onClose,
  mapId,
  rasterId,
  colormap,
  setRasterColormap,
}) => {
  return (
    <Menu anchorEl={anchorEl} open={open} onClose={onClose}>
      <ListSubheader>Raster Colormap</ListSubheader>
      {RASTER_COLORMAPS.map((cm) => (
        <MenuItem
          key={cm.name}
          selected={colormap === cm.name}
          onClick={() => {
            setRasterColormap(mapId, rasterId, cm.name);
            onClose();
          }}
        >
          {cm.label}
        </MenuItem>
      ))}
    </Menu>
  );
};
