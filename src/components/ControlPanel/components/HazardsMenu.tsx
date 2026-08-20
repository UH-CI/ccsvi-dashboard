import React, { useCallback, useMemo, useState } from "react";
import { Box, Stack, Collapse, IconButton } from "@mui/material";
import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { useMapStore, useHazardLayersStore } from "../../../stores";
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
    return (
      <Box key={parent.id} className={styles["layer-toggle"]}>
        <Box display="flex" alignItems="center">
          <LayerToggleItem
            label={parent.name}
            icon={parent.icon}
            color={parent.color}
            fallbackIcon="FaExclamationTriangle"
            checked={isParentVisible}
            onToggle={() => toggleHazardLayerVisibility(resolvedHazardsMapId, parent.id)}
          />
          {hasSubs && (
            <IconButton size="small" onClick={() => toggleExpand(parent.id)}>
              {expandedHazards[parent.id] ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          )}
        </Box>
        {hasSubs && (
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
                    checked={isSubVisible}
                    indented
                    labelMl={0}
                    onToggle={() =>
                      toggleSubLayerVisibility(resolvedHazardsMapId, parent.id, sub.id)
                    }
                  />
                );
              })}
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
        </Stack>
      )}
    </MenuShell>
  );
};
