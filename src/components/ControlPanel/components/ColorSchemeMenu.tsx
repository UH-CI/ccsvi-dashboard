import React from "react";
import { Menu, MenuItem, ListSubheader, Divider, Box, Typography, Slider } from "@mui/material";
import { MapConfig } from "../../../types";
import { BIVARIATE_SCHEMES, COLOR_SCHEMES, DEFAULT_BIVARIATE_SCHEME } from "../../../config";
import { useDatasets } from "../../../api/queries/datasets";
import styles from "../ControlPanel.module.scss";

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
  mapOpacities: LayerOpacities;
  updateMapConfig: (mapId: string, updates: Partial<MapConfig>) => void;
  setLayerOpacity: (
    mapId: string,
    layerType: "census" | "hawaiianHomelands" | "countyBoundaries",
    opacity: number,
  ) => void;
}

// Color-scheme picker (sequential/diverging/bivariate) plus per-layer opacity sliders.
export const ColorSchemeMenu: React.FC<ColorSchemeMenuProps> = ({
  anchorEl,
  open,
  onClose,
  config,
  mapOpacities,
  updateMapConfig,
  setLayerOpacity,
}) => {
  const dataset = useDatasets();

  return (
    <Menu anchorEl={anchorEl} open={open} onClose={onClose}>

      <Box className={styles["opacity-section"]}>
        <Typography variant="caption" className={styles["opacity-section-label"]}>
          Layer Opacity
        </Typography>

        {config.dataset &&
          dataset?.[config.dataset] &&
          !dataset[config.dataset].hawaiianHomelands && (
            <Box className={styles["opacity-field"]}>
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
            <Box className={styles["opacity-field"]}>
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

      
      <Divider />


      {(["Sequential", "Diverging"] as const).map((section) => (
        <React.Fragment key={section}>
          <ListSubheader>{section}</ListSubheader>
          {COLOR_SCHEMES.filter((scheme) => scheme.section === section).map(
            ({ name, label }) => (
              <MenuItem
                key={name}
                selected={config.colorScheme === name}
                onClick={() => {
                  updateMapConfig(config.id, { colorScheme: name });
                  onClose();
                }}
              >
                {label}
              </MenuItem>
            ),
          )}
        </React.Fragment>
      ))}

      {config.metric2 && (
        <>
          <Divider />
          <ListSubheader>Bivariate Palette</ListSubheader>
          {BIVARIATE_SCHEMES.map(({ name, label }) => (
            <MenuItem
              key={name}
              selected={(config.bivariateColorScheme ?? DEFAULT_BIVARIATE_SCHEME) === name}
              onClick={() => {
                updateMapConfig(config.id, { bivariateColorScheme: name });
                onClose();
              }}
            >
              {label}
            </MenuItem>
          ))}
        </>
      )}
    </Menu>
  );
};
