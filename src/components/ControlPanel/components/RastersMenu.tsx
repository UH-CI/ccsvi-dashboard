import React, { useCallback, useMemo, useState } from "react";
import {
  Box,
  Stack,
  Collapse,
  IconButton,
  Checkbox,
  Typography,
  FormControlLabel,
} from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import * as FaIcons from "react-icons/fa";
import { useMapStore, useRasterLayersStore } from "../../../stores";
import styles from "../ControlPanel.module.scss";
import { MenuShell } from "./MenuShell";
import { MapTabSelector } from "./MapTabSelector";
import { useResolvedMapId } from "../hooks/useResolvedMapId";

interface RastersMenuProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onInfoClick: (e: React.MouseEvent<HTMLElement>) => void;
}

export const RastersMenu: React.FC<RastersMenuProps> = ({
  open,
  anchorEl,
  onClose,
  onInfoClick,
}) => {
  const mapConfigs = useMapStore((s) => s.mapConfigs);
  const primaryMapId = useMapStore((s) => s.primaryMapId);
  const rasterLayerConfigs = useRasterLayersStore((s) => s.rasterLayerConfigs);
  const visibleRasterLayerIdsByMap = useRasterLayersStore((s) => s.visibleLayerIdsByMap);
  const toggleRasterLayerVisibility = useRasterLayersStore((s) => s.toggleRasterLayerVisibility);
  const toggleSubRasterLayerVisibility = useRasterLayersStore(
    (s) => s.toggleSubRasterLayerVisibility,
  );

  const visibleMaps = useMemo(() => mapConfigs.filter((c) => c.visible), [mapConfigs]);
  const [rastersMapId, setRastersMapId] = useState<string>("");
  const resolvedRastersMapId = useResolvedMapId(rastersMapId, visibleMaps, primaryMapId);
  const [expandedRasters, setExpandedRasters] = useState<Record<string, boolean>>({});
  const toggleExpandRaster = useCallback(
    (id: string) => setExpandedRasters((prev) => ({ ...prev, [id]: !prev[id] })),
    [],
  );

  return (
    <MenuShell
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      title="Terrain / Rasters"
      onInfoClick={onInfoClick}
    >
      <MapTabSelector
        mapConfigs={visibleMaps}
        selectedMapId={resolvedRastersMapId}
        onChange={setRastersMapId}
      />
      {resolvedRastersMapId && (
        <Stack spacing={1}>
          {rasterLayerConfigs.map((parent) => {
            const ParentIcon = FaIcons[parent.icon as keyof typeof FaIcons] || FaIcons.FaMap;
            const hasChildren = !!parent.subLayers?.length;
            const visibleRasterIdsForMap =
              visibleRasterLayerIdsByMap[resolvedRastersMapId] ?? new Set<string>();
            const isParentVisible = visibleRasterIdsForMap.has(parent.id);
            return (
              <Box key={parent.id} className={styles["layer-toggle"]}>
                <Box display="flex" alignItems="center">
                  {!hasChildren && (
                    <Checkbox
                      checked={isParentVisible}
                      onChange={() => toggleRasterLayerVisibility(resolvedRastersMapId, parent.id)}
                      size="small"
                    />
                  )}
                  <Typography
                    className={styles["layer-label"]}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      flexGrow: 1,
                      ml: hasChildren ? "21px" : 0,
                    }}
                  >
                    <span className={styles["layer-icon"]} style={{ color: parent.color }}>
                      <ParentIcon size="1rem" />
                    </span>
                    {parent.name}
                  </Typography>
                  {hasChildren && (
                    <IconButton size="small" onClick={() => toggleExpandRaster(parent.id)}>
                      {expandedRasters[parent.id] ? <ExpandLess /> : <ExpandMore />}
                    </IconButton>
                  )}
                </Box>
                {hasChildren && (
                  <Collapse in={expandedRasters[parent.id]}>
                    <Stack spacing={1} className={styles["layer-sub-stack"]}>
                      {parent.subLayers!.map((sub) => {
                        const compositeId = `${parent.id}.${sub.id}`;
                        const isSubVisible = visibleRasterIdsForMap.has(compositeId);
                        return (
                          <FormControlLabel
                            key={sub.id}
                            className={styles["raster-form-label"]}
                            control={
                              <Checkbox
                                checked={isSubVisible}
                                onChange={() =>
                                  toggleSubRasterLayerVisibility(
                                    resolvedRastersMapId,
                                    parent.id,
                                    sub.id,
                                  )
                                }
                                size="small"
                              />
                            }
                            label={sub.name}
                          />
                        );
                      })}
                    </Stack>
                  </Collapse>
                )}
              </Box>
            );
          })}
        </Stack>
      )}
    </MenuShell>
  );
};
