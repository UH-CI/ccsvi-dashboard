import React, { useCallback, useMemo, useState } from "react";
import { Box, Stack, Collapse, IconButton, Checkbox, FormControlLabel } from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import * as FaIcons from "react-icons/fa";
import { useMapStore, useHazardLayersStore, useRasterLayersStore } from "../../../stores";
import styles from "../ControlPanel.module.scss";
import { MenuShell } from "./MenuShell";
import { MapTabSelector } from "./MapTabSelector";
import { LayerToggleItem } from "./LayerToggleItem";
import { LayerToggleGroup } from "./LayerToggleGroup";
import { useResolvedMapId } from "../hooks/useResolvedMapId";
import type { HazardLayerConfig } from "../../../types";
import {
  buildHazardMenuSections,
  hazardMenuGroupExpandKey,
} from "../../../utils/hazardMenuSections";

interface HazardsMenuProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onInfoClick: (e: React.MouseEvent<HTMLElement>) => void;
}

export const HazardsMenu: React.FC<HazardsMenuProps> = ({
  open,
  anchorEl,
  onClose,
  onInfoClick,
}) => {
  const mapConfigs = useMapStore((s) => s.mapConfigs);
  const primaryMapId = useMapStore((s) => s.primaryMapId);
  const hazardLayerConfigs = useHazardLayersStore((s) => s.hazardLayerConfigs);
  const visibleHazardLayerIdsByMap = useHazardLayersStore((s) => s.visibleLayerIdsByMap);
  const toggleHazardLayerVisibility = useHazardLayersStore((s) => s.toggleHazardLayerVisibility);
  const toggleSubLayerVisibility = useHazardLayersStore((s) => s.toggleSubLayerVisibility);

  // Raster layers
  const rasterLayerConfigs = useRasterLayersStore((s) => s.rasterLayerConfigs);
  const visibleRasterLayerIdsByMap = useRasterLayersStore((s) => s.visibleLayerIdsByMap);
  const toggleRasterLayerVisibility = useRasterLayersStore((s) => s.toggleRasterLayerVisibility);
  const toggleSubRasterLayerVisibility = useRasterLayersStore((s) => s.toggleSubRasterLayerVisibility);
  const setVisibleLayerIds = useRasterLayersStore((s) => s.setVisibleLayerIds);

  const visibleMaps = useMemo(() => mapConfigs.filter((c) => c.visible), [mapConfigs]);
  const [hazardsMapId, setHazardsMapId] = useState<string>("");
  const resolvedHazardsMapId = useResolvedMapId(hazardsMapId, visibleMaps, primaryMapId);
  const [expandedHazards, setExpandedHazards] = useState<Record<string, boolean>>({});
  const toggleExpand = useCallback(
    (id: string) => setExpandedHazards((prev) => ({ ...prev, [id]: !prev[id] })),
    [],
  );

  const menuSections = useMemo(
    () => buildHazardMenuSections(hazardLayerConfigs, "hazards"),
    [hazardLayerConfigs],
  );

   const renderHazardParent = (parent: HazardLayerConfig) => {
    const isParentVisible =
      visibleHazardLayerIdsByMap[resolvedHazardsMapId]?.has(parent.id) ?? false;
    const hasSubs = (parent.subLayers ?? []).length > 0;
    
    // Check if this is Flooding to add Storm Surge
    const isFloodingParent = parent.id === "flood_hazard";
    const stormSurgeConfig = isFloodingParent 
      ? rasterLayerConfigs.find((r) => r.id === "stormSurge")
      : null;
    const stormSurgeHasChildren = !!stormSurgeConfig?.subLayers?.length;
    
    return (
      <Box key={parent.id} className={styles["layer-toggle"]}>
        <Box display="flex" alignItems="center">
          <LayerToggleItem
            label={parent.name}
            description={parent.description}
            icon={parent.icon}
            color={parent.color}
            fallbackIcon="FaExclamationTriangle"
            checked={isParentVisible}
            onToggle={() => toggleHazardLayerVisibility(resolvedHazardsMapId, parent.id)}
          />
          {(hasSubs || stormSurgeConfig) && (
            <IconButton size="small" onClick={() => toggleExpand(parent.id)}>
              {expandedHazards[parent.id] ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          )}
        </Box>
        {(hasSubs || stormSurgeConfig) && (
          <Collapse in={expandedHazards[parent.id]}>
            <Stack spacing={1} className={styles["layer-sub-stack"]}>
              {parent.subLayers!.map((sub) => {
                const compositeId = `${parent.id}.${sub.id}`;
                const isSubVisible =
                  visibleHazardLayerIdsByMap[resolvedHazardsMapId]?.has(compositeId) ?? false;
                return (
                  <LayerToggleItem
                    key={sub.id}
                    label={sub.name}
                    description={sub.description}
                    checked={isSubVisible}
                    indented
                    labelMl={0}
                    onToggle={() =>
                      toggleSubLayerVisibility(resolvedHazardsMapId, parent.id, sub.id)
                    }
                  />
                );
              })}
              {/* Render Storm Surge under Flooding */}
              {stormSurgeConfig && (
                <>
                  <Box display="flex" alignItems="center" ml={1}>
                    <Checkbox
                      checked={
                        stormSurgeConfig.subLayers?.every(
                          (sub) =>
                            visibleRasterLayerIdsByMap[resolvedHazardsMapId]?.has(
                              `stormSurge.${sub.id}`
                            ) ?? false
                        ) ?? false
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          // Check all sublayers - set all at once
                          const idsToShow = stormSurgeConfig.subLayers!.map(
                            (sub) => `stormSurge.${sub.id}`
                          );
                          setVisibleLayerIds(resolvedHazardsMapId, idsToShow);
                        } else {
                          // Uncheck all sublayers
                          setVisibleLayerIds(resolvedHazardsMapId, []);
                        }
                      }}
                      size="small"
                    />
                    <Box sx={{ display: "flex", alignItems: "center", flexGrow: 1 }}>
                      <span>{stormSurgeConfig.name}</span>
                    </Box>
                    {stormSurgeHasChildren && (
                      <IconButton size="small" onClick={() => toggleExpand("stormSurge")}>
                        {expandedHazards["stormSurge"] ? <ExpandLess /> : <ExpandMore />}
                      </IconButton>
                    )}
                  </Box>
                  {stormSurgeHasChildren && (
                    <Collapse in={expandedHazards["stormSurge"]}>
                      <Stack spacing={1} className={styles["layer-sub-stack"]}>
                        {stormSurgeConfig.subLayers!.map((sub) => {
                          const compositeId = `stormSurge.${sub.id}`;
                          const isSubVisible =
                            visibleRasterLayerIdsByMap[resolvedHazardsMapId]?.has(compositeId) ?? false;
                          return (
                            <FormControlLabel
                              key={sub.id}
                              className={styles["raster-form-label"]}
                              control={
                                <Checkbox
                                  checked={isSubVisible}
                                  onChange={() =>
                                    toggleSubRasterLayerVisibility(resolvedHazardsMapId, "stormSurge", sub.id)
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
                </>
              )}
            </Stack>
          </Collapse>
        )}
      </Box>
    );
  };

  return (
    <MenuShell
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      title="Hazard Layers"
      onInfoClick={onInfoClick}
    >
      <MapTabSelector
        mapConfigs={visibleMaps}
        selectedMapId={resolvedHazardsMapId}
        onChange={setHazardsMapId}
      />
      {resolvedHazardsMapId && (
        <Stack spacing={1}>
          {menuSections.map((section) => {
            if (section.kind === "layer") {
              return renderHazardParent(section.layer);
            }
            const expandKey = hazardMenuGroupExpandKey(section.label);
            return (
              <LayerToggleGroup
                key={expandKey}
                label={section.label}
                expanded={expandedHazards[expandKey] ?? false}
                onToggleExpand={() => toggleExpand(expandKey)}
                childrenPl={2}
              >
                {section.layers.map(renderHazardParent)}
              </LayerToggleGroup>
            );
          })}
          {/* Rasters Section */}
          {rasterLayerConfigs.filter(r => r.id !== "stormSurge").length > 0 && (
            <Stack spacing={1}>
                {rasterLayerConfigs.filter(r => r.id !== "stormSurge").map((parent) => {
                  const ParentIcon = FaIcons[parent.icon as keyof typeof FaIcons] || FaIcons.FaMap;
                  const hasChildren = !!parent.subLayers?.length;
                  const isParentVisible =
                   visibleRasterLayerIdsByMap[resolvedHazardsMapId]?.has(parent.id) ?? false;
                  
                  return (
                   <Box key={parent.id} className={styles["layer-toggle"]}>
                     <Box display="flex" alignItems="center">
                       {!hasChildren && (
                         <Checkbox
                           checked={isParentVisible}
                           onChange={() => toggleRasterLayerVisibility(resolvedHazardsMapId, parent.id)}
                           size="small"
                         />
                       )}
                       <Box
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
                       </Box>
                       {hasChildren && (
                         <IconButton size="small" onClick={() => toggleExpand(parent.id)}>
                           {expandedHazards[parent.id] ? <ExpandLess /> : <ExpandMore />}
                         </IconButton>
                       )}
                     </Box>
                     {hasChildren && (
                       <Collapse in={expandedHazards[parent.id]}>
                         <Stack spacing={1} className={styles["layer-sub-stack"]}>
                           {parent.subLayers!.map((sub) => {
                             const compositeId = `${parent.id}.${sub.id}`;
                             const isSubVisible =
                               visibleRasterLayerIdsByMap[resolvedHazardsMapId]?.has(compositeId) ?? false;
                             return (
                               <FormControlLabel
                                 key={sub.id}
                                 className={styles["raster-form-label"]}
                                 control={
                                   <Checkbox
                                     checked={isSubVisible}
                                     onChange={() =>
                                       toggleSubRasterLayerVisibility(resolvedHazardsMapId, parent.id, sub.id)
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
        </Stack>
      )}
    </MenuShell>
  );
};
