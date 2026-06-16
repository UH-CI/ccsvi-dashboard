import React from "react";
import { Menu, MenuItem, ListSubheader } from "@mui/material";

const RASTER_COLORMAPS: { label: string; value: string }[] = [
  { label: "Blues", value: "blues" },
  { label: "Reds", value: "reds" },
  { label: "Greens", value: "greens" },
  { label: "Oranges", value: "oranges" },
  { label: "Purples", value: "purples" },
  { label: "YlOrRd", value: "ylorrd" },
  { label: "YlGn", value: "ylgn" },
  { label: "BuPu", value: "bupu" },
  { label: "GnBu", value: "gnbu" },
  { label: "Viridis", value: "viridis" },
  { label: "Plasma", value: "plasma" },
  { label: "Inferno", value: "inferno" },
  { label: "Magma", value: "magma" },
];

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
          key={cm.value}
          selected={activeRasterColormap === cm.value}
          onClick={() => {
            setRasterColormap(mapId, activeRasterLeafId, cm.value);
            onClose();
          }}
        >
          {cm.label}
        </MenuItem>
      ))}
    </Menu>
  );
};
