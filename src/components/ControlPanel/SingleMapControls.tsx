import React, { useMemo, useState } from "react";
import {
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Box,
  Button,
  Menu,
  Divider,
  ListSubheader,
} from "@mui/material";
import { Visibility, VisibilityOff, Close, Palette, Edit, Gradient, ExpandMore } from "@mui/icons-material";
//"Controls" submenu for each map
import {
  useAppStore,
  useMapStore,
  useMapConfig,
  DEFAULT_LAYER_OPACITIES,
  useRasterLayersStore,
} from "../../stores";
import styles from "./ControlPanel.module.scss";
import { ColorSchemeMenu } from "./components/ColorSchemeMenu";
import { RasterColormapMenu } from "./components/RasterColormapMenu";
import { ComparisonMetricSelect } from "./components/ComparisonMetricSelect";

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
  const [isRenamingPreview, setIsRenamingPreview] = useState(false);
  const [controlsMenuAnchor, setControlsMenuAnchor] = useState<HTMLElement | null>(null);

  const titleInputRef = React.useRef<HTMLInputElement | null>(null);

  // Focus input
  React.useEffect(() => {
    if (isEditingTitle) {
      // Defer focusing to the next macrotask to ensure the input is mounted and visible
      // (closing menus can affect focus timing)
      setTimeout(() => {
        if (titleInputRef.current) {
          titleInputRef.current.focus();
          const len = titleInputRef.current.value.length;
          titleInputRef.current.setSelectionRange(len, len);
        }
      }, 0);
    }
  }, [isEditingTitle]);

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
    return (
      parent?.subLayers?.find((s) => s.id === subId)?.colormapName ?? parent?.colormapName ?? null
    );
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
      {section !== "dataset" && (
        <Box className={styles["single-map-actions"]}>
          {isEditingTitle ? (
            <input
              ref={titleInputRef}
              className={styles["map-tab-input"]}
              value={titleEditValue}
              onChange={(e) => setTitleEditValue(e.target.value)}
              onBlur={() => {
                updateMapConfig(config.id, { title: titleEditValue.trim() || config.title });
                setIsEditingTitle(false);
                setIsRenamingPreview(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  updateMapConfig(config.id, { title: titleEditValue.trim() || config.title });
                  setIsEditingTitle(false);
                  setIsRenamingPreview(false);
                }
                if (e.key === "Escape") {
                  setIsEditingTitle(false);
                  setIsRenamingPreview(false);
                }
              }}
            />
          ) : isRenamingPreview ? (
            // Preview state: styled title with trailing underscore to hint editability
            <Typography
              variant="body2"
              className={styles["single-map-title"]}
              onClick={() => {
                // Switch to real edit input when user clicks the previewed title
                setIsEditingTitle(true);
                setIsRenamingPreview(false);
                setTitleEditValue(config.title);
              }}
              style={{ fontWeight: 700, cursor: "text" }}
            >
              {config.title}
              <span style={{ opacity: 0.8 }}>{" _"}</span>
            </Typography>
          ) : (
            <Typography variant="body2" className={styles["single-map-title"]}>
              {config.title}
            </Typography>
          )}
          {/* Prominent Controls button — opens a labeled submenu replacing small icon buttons */}
          <Button
            size="small"
            onClick={(e) => setControlsMenuAnchor(e.currentTarget)}
            endIcon={<ExpandMore fontSize="small" />}
            className={styles["single-map-controls-btn"]}
          >
            Controls
          </Button>
          
          {/* Controls Menu — central dropdown grouping map-specific actions (visibility, rename, color, raster colormap, remove) */}
          <Menu
            anchorEl={controlsMenuAnchor}
            open={Boolean(controlsMenuAnchor)}
            onClose={() => {
              // Only close if no submenu is open
              if (!colorSchemeAnchor && !rasterColorSchemeAnchor) {
                setControlsMenuAnchor(null);
              }
            }}
            transformOrigin={{ horizontal: "right", vertical: "top" }}
            anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
          >
            {/* Visibility Control */}
            <MenuItem
              onClick={() => {
                toggleMapVisibility(config.id);
                setControlsMenuAnchor(null);
              }}
            >
              {config.visible ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}
              <Typography variant="body2" sx={{ ml: 1 }}>
                {config.visible ? "Hide Map" : "Show Map"}
              </Typography>
            </MenuItem>

            {/* Rename Control */}
            <MenuItem
              onClick={() => {
                // close Controls menu so the inline input is visible and delay focus slightly.
                setIsEditingTitle(true);
                setIsRenamingPreview(false);
                setTitleEditValue(config.title);
                setControlsMenuAnchor(null);
              }}
            >
              <Edit fontSize="small" />
              <Typography variant="body2" sx={{ ml: 1 }}>
                Rename Map
              </Typography>
            </MenuItem>

            <Divider />

            {/* Color Scheme Control */}
            {config.visible && config.dataset && config.metric && (
              <>
                <MenuItem
                  onClick={(e) => {
                    setColorSchemeAnchor(e.currentTarget);
                  }}
                  sx={{ display: "flex", justifyContent: "space-between" }}
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Palette fontSize="small" />
                    <Typography variant="body2" sx={{ ml: 1 }}>
                      Color Scheme
                    </Typography>
                  </Box>
                  <ExpandMore fontSize="small" />
                </MenuItem>
              </>
            )}

            {/* Raster Colormap Control */}
            {activeRasterLeafId && (
              <>
                <MenuItem
                  onClick={(e) => {
                    setRasterColorSchemeAnchor(e.currentTarget);
                  }}
                  sx={{ display: "flex", justifyContent: "space-between" }}
                >
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    <Gradient fontSize="small" />
                    <Typography variant="body2" sx={{ ml: 1 }}>
                      Raster Colormap
                    </Typography>
                  </Box>
                  <ExpandMore fontSize="small" />
                </MenuItem>
              </>
            )}

            <Divider />

            {/* Remove Control */}
            {canRemoveMap && (
              <MenuItem
                onClick={() => {
                  onRemove(config.id);
                  setControlsMenuAnchor(null);
                }}
                sx={{ color: "error.main" }}
              >
                <Close fontSize="small" />
                <Typography variant="body2" sx={{ ml: 1 }}>
                  Remove Map
                </Typography>
              </MenuItem>
            )}
          </Menu>

          {/* Color Scheme Submenu */}
          {config.visible && config.dataset && config.metric && (
            <ColorSchemeMenu
              anchorEl={colorSchemeAnchor}
              open={Boolean(colorSchemeAnchor)}
              onClose={() => setColorSchemeAnchor(null)}
              config={config}
              dataset={dataset}
              mapOpacities={mapOpacities}
              updateMapConfig={updateMapConfig}
              setLayerOpacity={setLayerOpacity}
            />
          )}

          {/* Raster Colormap Submenu */}
          {activeRasterLeafId && (
            <RasterColormapMenu
              anchorEl={rasterColorSchemeAnchor}
              open={Boolean(rasterColorSchemeAnchor)}
              onClose={() => setRasterColorSchemeAnchor(null)}
              mapId={mapId}
              activeRasterLeafId={activeRasterLeafId}
              activeRasterColormap={activeRasterColormap}
              setRasterColormap={setRasterColormap}
            />
          )}
        </Box>
      )}

      {section !== "management" && config.visible && (
        <Box className={styles["single-map-fields"]}>
          <FormControl size="small" fullWidth>
            <InputLabel>Dataset</InputLabel>
            <Select
              value={config.dataset || ""}
              onChange={(e) =>
                updateMapConfig(config.id, {
                  dataset: e.target.value,
                  metric: "",
                  dataset2: undefined,
                  metric2: undefined,
                })
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
                onChange={(e) =>
                  updateMapConfig(config.id, {
                    metric: e.target.value,
                    dataset2: undefined,
                    metric2: undefined,
                  })
                }
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
            <ComparisonMetricSelect
              blockGroupData={dataset}
              dataset={config.dataset}
              metric={config.metric}
              dataset2={config.dataset2}
              metric2={config.metric2}
              onChange={(next) => updateMapConfig(config.id, next)}
              label="Comparison Vulnerability Indicator"
            />
          )}
        </Box>
      )}
    </Box>
  );
};
