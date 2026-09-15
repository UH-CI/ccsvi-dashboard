import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  MenuList,
  Box,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Close,
  Palette,
  Edit,
  Gradient,
  ExpandMore,
  Map,
} from "@mui/icons-material";
// Management actions for each map
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
import { BaseMapMenu } from "./components/BaseMapMenu";

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
  const [baseMapAnchor, setBaseMapAnchor] = useState<HTMLElement | null>(null);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleEditValue, setTitleEditValue] = useState("");
  const visibleRasterIdsByMap = useRasterLayersStore((s) => s.visibleLayerIdsByMap);
  const rasterColormapOverrides = useRasterLayersStore((s) => s.colormapOverrides);
  const rasterLayerConfigs = useRasterLayersStore((s) => s.rasterLayerConfigs);
  const setRasterColormap = useRasterLayersStore((s) => s.setRasterColormap);

  const titleInputRef = useRef<HTMLInputElement | null>(null);

  // Focus input
  useEffect(() => {
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

  const datasetList = useMemo(() => {
    if (!dataset) return [];
    return Object.entries(dataset).map(([key, cfg]) => ({
      id: key,
      label: cfg.metricLabel || key.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      hawaiianHomelands: cfg.hawaiianHomelands || false,
    }));
  }, [dataset]);
  const activeRasterLeafId = useMemo(() => {
    const visible = visibleRasterIdsByMap[mapId];
    if (!visible || visible.size === 0) return null;
    for (const id of visible) {
      if (id.includes(".")) return id;
    }
    return [...visible][0] ?? null;
  }, [visibleRasterIdsByMap, mapId]);

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

  const activeBaseMapId = config?.baseMap ?? "openstreet";

  if (!config) return null;

  return (
    <Box className={styles["single-map-controls"]}>
      {section !== "dataset" && (
        <>
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
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    updateMapConfig(config.id, { title: titleEditValue.trim() || config.title });
                    setIsEditingTitle(false);
                  }
                  if (e.key === "Escape") {
                    setIsEditingTitle(false);
                  }
                }}
              />
            ) : (
              <Typography variant="body2" className={styles["single-map-title"]}>
                {config.title}
              </Typography>
            )}
            {/* Color Scheme Submenu */}
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
            <BaseMapMenu
              anchorEl={baseMapAnchor}
              open={Boolean(baseMapAnchor)}
              onClose={() => setBaseMapAnchor(null)}
              mapId={mapId}
              activeBaseMapId={activeBaseMapId}
              updateMapConfig={updateMapConfig}
            />
          </Box>
          {section === "management" && (
            <MenuList disablePadding>
              <MenuItem
                onClick={() => toggleMapVisibility(config.id)}
                className={styles["single-map-item"]}
              >
                {config.visible ? (
                  <Visibility fontSize="small" />
                ) : (
                  <VisibilityOff fontSize="small" />
                )}
                <Typography variant="body2" sx={{ ml: 1 }}>
                  {config.visible ? "Hide Map" : "Show Map"}
                </Typography>
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setTitleEditValue(config.title);
                  setIsEditingTitle(true);
                }}
                className={styles["single-map-item"]}
              >
                <Edit fontSize="small" />
                <Typography variant="body2" sx={{ ml: 1 }}>
                  Rename Map
                </Typography>
              </MenuItem>
              <MenuItem
                onClick={(e) => setColorSchemeAnchor(e.currentTarget)}
                className={styles["single-map-item"]}
                disabled={!config.dataset}
                title={!config.dataset ? "Select a dataset first" : ""}
              >
                {/* Color scheme selection requires loaded data */}
                <Box sx={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
                  <Palette fontSize="small" />
                  <Typography variant="body2" sx={{ ml: 1 }}>
                    Color Scheme
                  </Typography>
                </Box>
                <ExpandMore fontSize="small" />
              </MenuItem>
              {activeRasterLeafId && (
                <MenuItem
                  onClick={(e) => setRasterColorSchemeAnchor(e.currentTarget)}
                  className={styles["single-map-item"]}
                >
                  <Box sx={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
                    <Gradient fontSize="small" />
                    <Typography variant="body2" sx={{ ml: 1 }}>
                      Raster Colormap
                    </Typography>
                  </Box>
                  <ExpandMore fontSize="small" />
                </MenuItem>
              )}
              <MenuItem
                onClick={(e) => setBaseMapAnchor(e.currentTarget)}
                className={styles["single-map-item"]}
              >
                <Box sx={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
                  <Map fontSize="small" />
                  <Typography variant="body2" sx={{ ml: 1 }}>
                    Base Map
                  </Typography>
                </Box>
                <ExpandMore fontSize="small" />
              </MenuItem>
              {canRemoveMap && (
                <MenuItem
                  onClick={() => onRemove(config.id)}
                  className={styles["single-map-item"]}
                  sx={{ color: "error.main" }}
                >
                  <Close fontSize="small" />
                  <Typography variant="body2" sx={{ ml: 1 }}>
                    Remove Map
                  </Typography>
                </MenuItem>
              )}
            </MenuList>
          )}
        </>
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
