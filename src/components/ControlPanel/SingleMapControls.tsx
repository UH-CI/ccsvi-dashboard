import React, { useMemo, useState } from "react";
import {
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Box,
} from "@mui/material";
import { Visibility, VisibilityOff, Close, Palette, Edit, Gradient } from "@mui/icons-material";
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
                <RasterColormapMenu
                  anchorEl={rasterColorSchemeAnchor}
                  open={Boolean(rasterColorSchemeAnchor)}
                  onClose={() => setRasterColorSchemeAnchor(null)}
                  mapId={mapId}
                  activeRasterLeafId={activeRasterLeafId}
                  activeRasterColormap={activeRasterColormap}
                  setRasterColormap={setRasterColormap}
                />
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
              {config.visible ? (
                <Visibility fontSize="small" />
              ) : (
                <VisibilityOff fontSize="small" />
              )}
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
