import React from "react";
import { Menu, MenuItem, ListSubheader } from "@mui/material";
import { RASTER_COLORMAPS } from "../../../config/colorSchemes";
import { useMapLayersStore, useMapRaster } from "../../../stores/useMapLayersStore";

interface RasterColormapMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  mapId: string;
  // The map's saved raster
  rasterId: string;
}

// Colormap picker for the map's saved raster
export const RasterColormapMenu: React.FC<RasterColormapMenuProps> = ({
  anchorEl,
  open,
  onClose,
  mapId,
  rasterId,
}) => {
  const colormap = useMapRaster(mapId)!.colormap;
  const setRasterColormap = useMapLayersStore((state) => state.setRasterColormap);
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
