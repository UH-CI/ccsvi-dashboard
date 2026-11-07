import React from "react";
import { Menu, MenuItem, ListSubheader } from "@mui/material";
import { RASTER_COLORMAPS } from "../../../config";
import type { ActiveRaster } from "../../../stores/useRasterLayersStore";

interface RasterColormapMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  mapId: string;
  activeRaster: ActiveRaster;
  setRasterColormap: (mapId: string, layerId: string, colormapName: string) => void;
}

// Colormap picker for the active raster layer
export const RasterColormapMenu: React.FC<RasterColormapMenuProps> = ({
  anchorEl,
  open,
  onClose,
  mapId,
  activeRaster,
  setRasterColormap,
}) => {
  return (
    <Menu anchorEl={anchorEl} open={open} onClose={onClose}>
      <ListSubheader>Raster Colormap</ListSubheader>
      {RASTER_COLORMAPS.map((cm) => (
        <MenuItem
          key={cm.name}
          selected={activeRaster.colormap === cm.name}
          onClick={() => {
            setRasterColormap(mapId, activeRaster.id, cm.name);
            onClose();
          }}
        >
          {cm.label}
        </MenuItem>
      ))}
    </Menu>
  );
};
