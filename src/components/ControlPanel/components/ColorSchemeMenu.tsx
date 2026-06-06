import React from "react";
import { Menu, MenuItem, ListSubheader, Divider, Box, Typography, Slider } from "@mui/material";
import { MapConfig, Dataset } from "../../../types";

interface LayerOpacities {
  census: number;
  hawaiianHomelands: number;
  countyBoundaries: number;
}

interface ColorSchemeMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  config: MapConfig;
  dataset: Dataset | null;
  mapOpacities: LayerOpacities;
  updateMapConfig: (mapId: string, updates: Partial<MapConfig>) => void;
  setLayerOpacity: (
    mapId: string,
    layerType: "census" | "hawaiianHomelands" | "countyBoundaries",
    opacity: number,
  ) => void;
}

const SEQUENTIAL_SCHEMES = [
  "Viridis",
  "YlOrRd",
  "YlGnBu",
  "Blues",
  "Reds",
  "Greens",
  "Purples",
  "Oranges",
  "GnBu",
  "BuPu",
];
const DIVERGING_SCHEMES = ["Spectral", "RdYlGn", "RdBu", "RdYlBu", "PRGn"];
const BIVARIATE_SCHEMES = ["PurpleBlue", "OrangePurple", "GreenBlue"];

// Color-scheme picker (sequential/diverging/bivariate) plus per-layer opacity sliders.
export const ColorSchemeMenu: React.FC<ColorSchemeMenuProps> = ({
  anchorEl,
  open,
  onClose,
  config,
  dataset,
  mapOpacities,
  updateMapConfig,
  setLayerOpacity,
}) => {
  return (
    <Menu anchorEl={anchorEl} open={open} onClose={onClose}>
      <ListSubheader>Sequential</ListSubheader>
      {SEQUENTIAL_SCHEMES.map((scheme) => (
        <MenuItem
          key={scheme}
          selected={config.colorScheme === scheme || (!config.colorScheme && scheme === "Viridis")}
          onClick={() => {
            updateMapConfig(config.id, { colorScheme: scheme });
            onClose();
          }}
        >
          {scheme}
        </MenuItem>
      ))}
      <ListSubheader>Diverging</ListSubheader>
      {DIVERGING_SCHEMES.map((scheme) => (
        <MenuItem
          key={scheme}
          selected={config.colorScheme === scheme}
          onClick={() => {
            updateMapConfig(config.id, { colorScheme: scheme });
            onClose();
          }}
        >
          {scheme}
        </MenuItem>
      ))}

      {config.metric2 && (
        <>
          <Divider />
          <ListSubheader>Bivariate Palette</ListSubheader>
          {BIVARIATE_SCHEMES.map((scheme) => (
            <MenuItem
              key={scheme}
              selected={
                config.bivariateColorScheme === scheme ||
                (!config.bivariateColorScheme && scheme === "PurpleBlue")
              }
              onClick={() => {
                updateMapConfig(config.id, { bivariateColorScheme: scheme });
                onClose();
              }}
            >
              {scheme}
            </MenuItem>
          ))}
        </>
      )}

      <Divider />

      <Box sx={{ px: 2, py: 1.5, minWidth: 200 }}>
        <Typography variant="caption" sx={{ fontWeight: 600, display: "block", mb: 1 }}>
          Layer Opacity
        </Typography>

        {config.dataset &&
          dataset?.[config.dataset] &&
          !dataset[config.dataset].hawaiianHomelands && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" gutterBottom display="block">
                Census Blocks
              </Typography>
              <Slider
                value={mapOpacities.census}
                onChange={(_, value) => setLayerOpacity(config.id, "census", value as number)}
                min={0}
                max={1}
                step={0.1}
                marks
                valueLabelDisplay="auto"
                size="small"
              />
            </Box>
          )}

        {config.dataset && dataset?.[config.dataset]?.hawaiianHomelands && (
          <>
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" gutterBottom display="block">
                Hawaiian Homelands
              </Typography>
              <Slider
                value={mapOpacities.hawaiianHomelands}
                onChange={(_, value) =>
                  setLayerOpacity(config.id, "hawaiianHomelands", value as number)
                }
                min={0}
                max={1}
                step={0.1}
                marks
                valueLabelDisplay="auto"
                size="small"
              />
            </Box>
            <Box>
              <Typography variant="caption" gutterBottom display="block">
                County Boundaries
              </Typography>
              <Slider
                value={mapOpacities.countyBoundaries}
                onChange={(_, value) =>
                  setLayerOpacity(config.id, "countyBoundaries", value as number)
                }
                min={0}
                max={1}
                step={0.1}
                marks
                valueLabelDisplay="auto"
                size="small"
              />
            </Box>
          </>
        )}
      </Box>
    </Menu>
  );
};
