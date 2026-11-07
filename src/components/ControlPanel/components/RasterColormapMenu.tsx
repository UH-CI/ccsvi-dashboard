import React from "react";
import { Menu, MenuItem, ListSubheader } from "@mui/material";
import { RASTER_COLORMAPS } from "../../../config";

interface RasterColormapMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  mapId: string;
  activeRasterLeafId: string;
  activeRasterColormap: string | null;
  setRasterColormap: (mapId: string, layerId: string, colormapName: string) => void;
}

// Colormap picker for the active raster layer
export const RasterColormapMenu: React.FC<RasterColormapMenuProps> = ({
  anchorEl,
  open,
  onClose,
  mapId,
  activeRasterLeafId,
  activeRasterColormap,
  setRasterColormap,
}) => {
  return (
    <Menu anchorEl={anchorEl} open={open} onClose={onClose}>
      <ListSubheader>Raster Colormap</ListSubheader>
      {RASTER_COLORMAPS.map((cm) => (
        <MenuItem
          key={cm.name}
          selected={activeRasterColormap === cm.name}
          onClick={() => {
            setRasterColormap(mapId, activeRasterLeafId, cm.name);
            onClose();
          }}
        >
          {cm.label}
        </MenuItem>
      ))}
    </Menu>
  );
};
