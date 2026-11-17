import React from "react";
import { Menu, MenuItem, ListSubheader, Divider, Box, Typography, Slider } from "@mui/material";
import {
  BIVARIATE_SCHEMES,
  COLOR_SCHEMES,
  DEFAULT_BIVARIATE_SCHEME,
} from "../../../config/colorSchemes";
import { POLYGON_LAYERS } from "../../../config/layers";
import { useMetric } from "../../../api/queries/metrics";
import { useMapState, useMapStore } from "../../../stores/useMapStore";
import styles from "../ControlPanel.module.scss";

interface ColorSchemeMenuProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  mapId: string;
}

// Color-scheme picker (sequential/diverging/bivariate) plus per-layer opacity sliders.
export const ColorSchemeMenu: React.FC<ColorSchemeMenuProps> = ({
  anchorEl,
  open,
  onClose,
  mapId,
}) => {
  const config = useMapState(mapId)!;
  const mapOpacities = config.opacities;
  const updateMap = useMapStore((state) => state.updateMap);
  const setLayerOpacity = useMapStore((state) => state.setLayerOpacity);
  const homelands = useMetric(config.metric)?.dataset.hawaiian_homelands;

  return (
    <Menu anchorEl={anchorEl} open={open} onClose={onClose}>

      <Box className={styles["opacity-section"]}>
        <Typography variant="caption" className={styles["opacity-section-label"]}>
          Layer Opacity
        </Typography>

        {homelands === false && (
          <Box className={styles["opacity-field"]}>
            <Typography variant="caption" gutterBottom display="block">
              {POLYGON_LAYERS.censusBlockGroups.name}
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

        {homelands && (
          <>
            <Box className={styles["opacity-field"]}>
              <Typography variant="caption" gutterBottom display="block">
                {POLYGON_LAYERS.hawaiianHomelands.name}
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
                {POLYGON_LAYERS.countyBoundaries.name}
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

      {/* A menu's items must be one flat list, so each section's heading and items are spread into it */}
      {(["Sequential", "Diverging"] as const).flatMap((section) => [
        <ListSubheader key={section}>{section}</ListSubheader>,
        ...COLOR_SCHEMES.filter((scheme) => scheme.section === section).map(({ name, label }) => (
          <MenuItem
            key={name}
            selected={config.colorScheme === name}
            onClick={() => {
              updateMap(config.id, { colorScheme: name });
              onClose();
            }}
          >
            {label}
          </MenuItem>
        )),
      ])}

      {config.metric2 && [
        <Divider key="bivariate-divider" />,
        <ListSubheader key="bivariate-heading">Bivariate Palette</ListSubheader>,
        ...BIVARIATE_SCHEMES.map(({ name, label }) => (
          <MenuItem
            key={name}
            selected={(config.bivariateColorScheme ?? DEFAULT_BIVARIATE_SCHEME) === name}
            onClick={() => {
              updateMap(config.id, { bivariateColorScheme: name });
              onClose();
            }}
          >
            {label}
          </MenuItem>
        )),
      ]}
    </Menu>
  );
};
