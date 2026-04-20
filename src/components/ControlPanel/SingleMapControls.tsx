import React, { useMemo, useState } from "react";
import {
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  IconButton,
  Box,
  Menu,
  Slider,
  ListSubheader,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Close,
  Palette,
  Edit,
} from "@mui/icons-material";
import { useAppStore, useMapStore, useMapConfig, DEFAULT_LAYER_OPACITIES } from "../../stores";
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
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleEditValue, setTitleEditValue] = useState("");

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
    <Box className={styles["single-map-controls"]}>
      <Box className={styles["single-map-actions"]}>
        {isEditingTitle ? (
          <input
            className={styles["map-tab-input"]}
            value={titleEditValue}
            autoFocus
            onChange={(e) => setTitleEditValue(e.target.value)}
            onBlur={() => {
              updateMapConfig(config.id, { title: titleEditValue.trim() || config.title });
              setIsEditingTitle(false);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                updateMapConfig(config.id, { title: titleEditValue.trim() || config.title });
                setIsEditingTitle(false);
              }
              if (e.key === "Escape") setIsEditingTitle(false);
            }}
          />
        ) : (
          <Typography variant="body2" className={styles["single-map-title"]}>
            {config.title}
          </Typography>
        )}
        <Box className={styles["single-map-action-btns"]}>
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
            onClick={() => {
              setIsEditingTitle(true);
              setTitleEditValue(config.title);
            }}
            title="Rename map"
          >
            <Edit fontSize="small" />
          </IconButton>
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
        <Box className={styles["single-map-fields"]}>
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
              <InputLabel>Vulnerability Indicator</InputLabel>
              <Select
                value={config.metric}
                onChange={(e) => updateMapConfig(config.id, { metric: e.target.value })}
                label="Vulnerability Indicator"
              >
                <MenuItem value="">
                  <em>Select Vulnerability Indicator</em>
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
              <InputLabel>Comparison Vulnerability Indicator</InputLabel>
              <Select
                value={config.metric2 || ""}
                onChange={(e) =>
                  updateMapConfig(config.id, { metric2: e.target.value || undefined })
                }
                label="Comparison Vulnerability Indicator"
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
        </Box>
      )}
    </Box>
  );
};
