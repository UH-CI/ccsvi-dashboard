import React, { useEffect, useMemo, useRef, useState } from "react";
import { Typography, MenuItem, MenuList, Box, Tooltip } from "@mui/material";
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
  useMapStore,
  useMapConfig,
  DEFAULT_LAYER_OPACITIES,
  useRasterLayersStore,
} from "../../stores";
import styles from "./ControlPanel.module.scss";
import { ColorSchemeMenu } from "./components/ColorSchemeMenu";
import { RasterColormapMenu } from "./components/RasterColormapMenu";
import { BaseMapMenu } from "./components/BaseMapMenu";
import { DEFAULT_BASE_MAP_ID } from "../../config/basemaps";

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
      return rasterLayerConfigs.find((l) => l.id === parentId)?.colormap ?? null;
    }
    const parent = rasterLayerConfigs.find((l) => l.id === parentId);
    return (
      parent?.subLayers?.find((s) => s.id === subId)?.colormap ?? parent?.colormap ?? null
    );
  }, [activeRasterLeafId, rasterColormapOverrides, rasterLayerConfigs, mapId]);

  const activeBaseMapId = config?.baseMap ?? DEFAULT_BASE_MAP_ID;

  if (!config) return null;

  return (
    <Box className={styles["single-map-controls"]}>
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
      <MenuList disablePadding>
        <MenuItem
          onClick={() => toggleMapVisibility(config.id)}
          className={styles["single-map-item"]}
        >
          {config.visible ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}
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
        {/* Color scheme selection requires loaded data */}
        <Tooltip title={config.dataset ? "" : "Select a dataset first"}>
          <span>
            <MenuItem
              onClick={(e) => setColorSchemeAnchor(e.currentTarget)}
              className={styles["single-map-item"]}
              disabled={!config.dataset}
            >
              <Box sx={{ display: "flex", alignItems: "center", flex: 1, minWidth: 0 }}>
                <Palette fontSize="small" />
                <Typography variant="body2" sx={{ ml: 1 }}>
                  Color Scheme
                </Typography>
              </Box>
              <ExpandMore fontSize="small" />
            </MenuItem>
          </span>
        </Tooltip>
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
    </Box>
  );
};
