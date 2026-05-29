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
  Gradient,
} from "@mui/icons-material";
import { useAppStore, useMapStore, useMapConfig, DEFAULT_LAYER_OPACITIES, useRasterLayersStore } from "../../stores";
import styles from "./ControlPanel.module.scss";

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

interface SingleMapControlsProps {
  mapId: string;
  canRemoveMap: boolean;
  onRemove: (mapId: string) => void;
  section?: "management" | "dataset" | "all";
}

export const SingleMapControls: React.FC<SingleMapControlsProps> = ({
  mapId,
  canRemoveMap,
  onRemove,
  section = "all",
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
  const [rasterColorSchemeAnchor, setRasterColorSchemeAnchor] = useState<HTMLElement | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleEditValue, setTitleEditValue] = useState("");

  const visibleRasterIdsByMap = useRasterLayersStore((s) => s.visibleLayerIdsByMap);
  const rasterColormapOverrides = useRasterLayersStore((s) => s.colormapOverrides);
  const rasterLayerConfigs = useRasterLayersStore((s) => s.rasterLayerConfigs);
  const setRasterColormap = useRasterLayersStore((s) => s.setRasterColormap);

  // The "leaf" raster ID is the one passed to TiTiler as raster_id.
  const activeRasterLeafId = useMemo(() => {
    const visible = visibleRasterIdsByMap[mapId];
    if (!visible || visible.size === 0) return null;
    for (const id of visible) {
      if (id.includes(".")) return id;
    }
    return [...visible][0] ?? null;
  }, [visibleRasterIdsByMap, mapId]);

  // Resolve the current colormap: override takes precedence, then the layer config default.
  const activeRasterColormap = useMemo(() => {
    if (!activeRasterLeafId) return null;
    const override = rasterColormapOverrides[mapId]?.[activeRasterLeafId];
    if (override) return override;
    const [parentId, subId] = activeRasterLeafId.split(".");
    if (!subId) {
      return rasterLayerConfigs.find((l) => l.id === parentId)?.colormapName ?? null;
    }
    const parent = rasterLayerConfigs.find((l) => l.id === parentId);
    return parent?.subLayers?.find((s) => s.id === subId)?.colormapName ?? parent?.colormapName ?? null;
  }, [activeRasterLeafId, rasterColormapOverrides, rasterLayerConfigs, mapId]);

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
      {section !== "dataset" && <Box className={styles["single-map-actions"]}>
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
          {activeRasterLeafId && (
            <>
              <IconButton
                size="small"
                onClick={(e) => setRasterColorSchemeAnchor(e.currentTarget)}
                title="Raster colormap"
              >
                <Gradient fontSize="small" />
              </IconButton>
              <Menu
                anchorEl={rasterColorSchemeAnchor}
                open={Boolean(rasterColorSchemeAnchor)}
                onClose={() => setRasterColorSchemeAnchor(null)}
              >
                <ListSubheader>Raster Colormap</ListSubheader>
                {RASTER_COLORMAPS.map((cm) => (
                  <MenuItem
                    key={cm.value}
                    selected={activeRasterColormap === cm.value}
                    onClick={() => {
                      setRasterColormap(mapId, activeRasterLeafId, cm.value);
                      setRasterColorSchemeAnchor(null);
                    }}
                  >
                    {cm.label}
                  </MenuItem>
                ))}
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
      </Box>}

      {section !== "management" && config.visible && (
        <Box className={styles["single-map-fields"]}>
          <FormControl size="small" fullWidth>
            <InputLabel>Dataset</InputLabel>
            <Select
              value={config.dataset || ""}
              onChange={(e) =>
                updateMapConfig(config.id, { dataset: e.target.value, metric: "", dataset2: undefined , metric2: undefined})
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
                onChange={(e) => updateMapConfig(config.id, { metric: e.target.value, dataset2: undefined, metric2: undefined})}
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
                value={config.metric2 ? `${config.dataset2 ?? config.dataset}::${config.metric2}` : ""}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!val) {
                    updateMapConfig(config.id, { metric2: undefined, dataset2: undefined });
                  } else {
                    const sepIdx = val.indexOf("::");
                    const ds = val.slice(0, sepIdx);
                    const metric = val.slice(sepIdx + 2);
                    updateMapConfig(config.id, {
                      metric2: metric,
                      dataset2: ds !== config.dataset ? ds : undefined,
                    });
                  }
                }}
                label="Comparison Vulnerability Indicator"
              >
                <MenuItem value="">
                  <em>None (univariate)</em>
                </MenuItem>
                {dataset && (() => {
                  const primaryIsHawaiian = config.dataset
                    ? (dataset[config.dataset]?.hawaiianHomelands ?? false)
                    : false;
                  return Object.entries(dataset)
                    .filter(([, dsObj]) => (dsObj.hawaiianHomelands ?? false) === primaryIsHawaiian)
                    .map(([dsId, dsObj]) => [
                      <ListSubheader key={`hdr-${dsId}`}>
                        {dsObj.metricLabel || dsId.replace(/_/g, " ")}
                      </ListSubheader>,
                      ...Object.keys(dsObj.columnThresholds || {})
                        .filter((m) => !(dsId === config.dataset && m === config.metric))
                        .map((metricName) => (
                          <MenuItem key={`${dsId}::${metricName}`} value={`${dsId}::${metricName}`}>
                            {metricName}
                          </MenuItem>
                        )),
                    ]);
                })()}
              </Select>
            </FormControl>
          )}
        </Box>
      )}
    </Box>
  );
};
