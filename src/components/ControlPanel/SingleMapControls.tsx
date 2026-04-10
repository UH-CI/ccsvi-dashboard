import React, { useMemo, useCallback, useState } from "react";
import {
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Divider,
  Stack,
  Collapse,
  IconButton,
  Box,
  Menu,
  Slider,
  ListSubheader,
} from "@mui/material";
import {
  ExpandMore,
  ExpandLess,
  Visibility,
  VisibilityOff,
  Close,
  Palette,
} from "@mui/icons-material";
import * as FaIcons from "react-icons/fa";
import {
  useAppStore,
  useMapStore,
  useMapConfig,
  usePointLayerStore,
  useHazardLayersStore,
  useRasterLayersStore,
  DEFAULT_LAYER_OPACITIES,
  defaultExpandedSections,
} from "../../stores";
import styles from "./ControlPanel.module.scss";

interface SingleMapControlsProps {
  mapId: string;
  canRemoveMap: boolean;
  onRemove: (mapId: string) => void;
}

export const SingleMapControls: React.FC<SingleMapControlsProps> = ({
  mapId,
  canRemoveMap,
  onRemove,
}) => {
  const config = useMapConfig(mapId);
  const dataset = useAppStore((state) => state.blockGroupData);

  const updateMapConfig = useMapStore((state) => state.updateMapConfig);
  const toggleMapVisibility = useMapStore((state) => state.toggleMapVisibility);

  const mapOpacities = useMapStore(
    (state) => state.layerOpacities[mapId] ?? DEFAULT_LAYER_OPACITIES,
  );
  const setLayerOpacity = useMapStore((state) => state.setLayerOpacity);

  const [colorSchemeAnchor, setColorSchemeAnchor] = useState<HTMLElement | null>(null);

  const datasetList = useMemo(() => {
    if (!dataset) return [];
    return Object.entries(dataset).map(([key, cfg]) => ({
      id: key,
      label: cfg.metricLabel || key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      hawaiianHomelands: cfg.hawaiianHomelands || false,
    }));
  }, [dataset]);

  if (!config) return null;

  return (
    <Box className={styles["map-item"]}>
      <Box className={styles["map-item-header"]}>
        <Box className={styles["map-item-actions"]}>
          {config.visible && config.dataset && config.metric && (
            <>
              <IconButton
                size="small"
                onClick={(e) => setColorSchemeAnchor(e.currentTarget)}
                title="Color scheme"
              >
                <Palette fontSize="small" />
              </IconButton>
              <Menu
                anchorEl={colorSchemeAnchor}
                open={Boolean(colorSchemeAnchor)}
                onClose={() => setColorSchemeAnchor(null)}
              >
                <ListSubheader>Sequential</ListSubheader>
                {[
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
                ].map((scheme) => (
                  <MenuItem
                    key={scheme}
                    selected={
                      config.colorScheme === scheme || (!config.colorScheme && scheme === "Viridis")
                    }
                    onClick={() => {
                      updateMapConfig(config.id, { colorScheme: scheme });
                      setColorSchemeAnchor(null);
                    }}
                  >
                    {scheme}
                  </MenuItem>
                ))}
                <ListSubheader>Diverging</ListSubheader>
                {["Spectral", "RdYlGn", "RdBu", "RdYlBu", "PRGn"].map((scheme) => (
                  <MenuItem
                    key={scheme}
                    selected={config.colorScheme === scheme}
                    onClick={() => {
                      updateMapConfig(config.id, { colorScheme: scheme });
                      setColorSchemeAnchor(null);
                    }}
                  >
                    {scheme}
                  </MenuItem>
                ))}

                {config.metric2 && (
                  <>
                    <Divider />
                    <ListSubheader>Bivariate Palette</ListSubheader>
                    {["PurpleBlue", "OrangePurple", "GreenBlue"].map((scheme) => (
                      <MenuItem
                        key={scheme}
                        selected={
                          config.bivariateColorScheme === scheme ||
                          (!config.bivariateColorScheme && scheme === "PurpleBlue")
                        }
                        onClick={() => {
                          updateMapConfig(config.id, { bivariateColorScheme: scheme });
                          setColorSchemeAnchor(null);
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
                          onChange={(_, value) =>
                            setLayerOpacity(config.id, "census", value as number)
                          }
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
            </>
          )}
          <IconButton
            size="small"
            onClick={() => toggleMapVisibility(config.id)}
            title={config.visible ? "Hide map" : "Show map"}
          >
            {config.visible ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}
          </IconButton>
          {canRemoveMap && (
            <IconButton
              size="small"
              onClick={() => onRemove(config.id)}
              title="Remove map"
              color="error"
            >
              <Close fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Box>

      {config.visible && (
        <Box className={styles["map-item-config"]}>
          <FormControl size="small" fullWidth>
            <InputLabel>Dataset</InputLabel>
            <Select
              value={config.dataset || ""}
              onChange={(e) =>
                updateMapConfig(config.id, { dataset: e.target.value, metric: "", metric2: "" })
              }
              label="Dataset"
            >
              {datasetList.map((ds) => (
                <MenuItem key={ds.id} value={ds.id}>
                  {ds.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {config.dataset && (
            <FormControl size="small" fullWidth>
              <InputLabel>Metric</InputLabel>
              <Select
                value={config.metric}
                onChange={(e) => updateMapConfig(config.id, { metric: e.target.value })}
                label="Metric"
              >
                <MenuItem value="">
                  <em>Select Metric</em>
                </MenuItem>
                {dataset &&
                  dataset[config.dataset] &&
                  Object.keys(dataset[config.dataset].columnThresholds || {}).map((metricName) => (
                    <MenuItem key={metricName} value={metricName}>
                      {metricName}
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
          )}

          {config.dataset && config.metric && (
            <FormControl size="small" fullWidth>
              <InputLabel>Comparison Metric</InputLabel>
              <Select
                value={config.metric2 || ""}
                onChange={(e) =>
                  updateMapConfig(config.id, { metric2: e.target.value || undefined })
                }
                label="Comparison Metric"
              >
                <MenuItem value="">
                  <em>None (univariate)</em>
                </MenuItem>
                {dataset &&
                  dataset[config.dataset] &&
                  Object.keys(dataset[config.dataset].columnThresholds || {})
                    .filter((m) => m !== config.metric)
                    .map((metricName) => (
                      <MenuItem key={metricName} value={metricName}>
                        {metricName}
                      </MenuItem>
                    ))}
              </Select>
            </FormControl>
          )}

          <Divider className={styles["section-divider"]} />
        </Box>
      )}
    </Box>
  );
};
