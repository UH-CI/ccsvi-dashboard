import React, { useCallback, useMemo, useState } from "react";
import { Stack } from "@mui/material";
import { useMapStore, useHazardLayersStore, useRasterLayersStore } from "../../../stores";
import styles from "../ControlPanel.module.scss";
import { MenuShell } from "./MenuShell";
import { MapTabSelector } from "./MapTabSelector";
import { LayerToggleItem } from "./LayerToggleItem";
import { LayerToggleGroup } from "./LayerToggleGroup";
import { useResolvedMapId } from "../hooks/useResolvedMapId";
import { HAZARD_MENU_GROUPS } from "../../../config/hazardLayers";
import type { HazardLayerConfig, RasterLayerConfig } from "../../../types";
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
  const rasterLayerConfigs = useRasterLayersStore((s) => s.rasterLayerConfigs);
  const visibleRasterLayerIdsByMap = useRasterLayersStore((s) => s.visibleLayerIdsByMap);
  const toggleRasterLayerVisibility = useRasterLayersStore((s) => s.toggleRasterLayerVisibility);
  const toggleSubRasterLayerVisibility = useRasterLayersStore(
    (s) => s.toggleSubRasterLayerVisibility,
  );

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
  const rasterGroup = HAZARD_MENU_GROUPS.find((g) => g.label === "Raster Layers")!;

  const renderHazardParent = (parent: HazardLayerConfig) => {
    const visibleIds = visibleHazardLayerIdsByMap[resolvedHazardsMapId] ?? new Set<string>();
    const toggleParent = () => toggleHazardLayerVisibility(resolvedHazardsMapId, parent.id);

    if (!parent.subLayers?.length) {
      return (
        <LayerToggleItem
          key={parent.id}
          label={parent.name}
          description={parent.description}
          icon={parent.icon}
          color={parent.color}
          fallbackIcon="FaExclamationTriangle"
          checked={visibleIds.has(parent.id)}
          onToggle={toggleParent}
          hideCheckbox
        />
      );
    }

    return (
      <LayerToggleGroup
        key={parent.id}
        label={parent.name}
        description={parent.description}
        icon={parent.icon}
        color={parent.color}
        fallbackIcon="FaExclamationTriangle"
        selectAll={{
          checked: visibleIds.has(parent.id),
          indeterminate: false,
          onToggle: toggleParent,
        }}
        hideCheckbox
        expanded={expandedHazards[parent.id] ?? false}
        onToggleExpand={() => toggleExpand(parent.id)}
        childrenPl={7}
      >
        {parent.subLayers.map((sub) => (
          <LayerToggleItem
            key={sub.id}
            label={sub.name}
            description={sub.description}
            checked={visibleIds.has(`${parent.id}.${sub.id}`)}
            indented
            labelMl={0}
            onToggle={() => toggleSubLayerVisibility(resolvedHazardsMapId, parent.id, sub.id)}
          />
        ))}
      </LayerToggleGroup>
    );
  };

  const renderRasterParent = (parent: RasterLayerConfig) => {
    const visibleIds = visibleRasterLayerIdsByMap[resolvedHazardsMapId] ?? new Set<string>();
    const toggleParent = () => toggleRasterLayerVisibility(resolvedHazardsMapId, parent.id);

    if (!parent.subLayers?.length) {
      return (
        <LayerToggleItem
          key={parent.id}
          label={parent.name}
          description={parent.description}
          icon={parent.icon}
          color={parent.color}
          fallbackIcon="FaMap"
          checked={visibleIds.has(parent.id)}
          onToggle={toggleParent}
          hideCheckbox
        />
      );
    }

    return (
      <LayerToggleGroup
        key={parent.id}
        label={parent.name}
        description={parent.description}
        icon={parent.icon}
        color={parent.color}
        fallbackIcon="FaMap"
        selectAll={{
          checked: visibleIds.has(parent.id),
          indeterminate: false,
          onToggle: toggleParent,
        }}
        hideCheckbox
        expanded={expandedHazards[parent.id] ?? false}
        onToggleExpand={() => toggleExpand(parent.id)}
        childrenPl={7}
      >
        {parent.subLayers.map((sub) => (
          <LayerToggleItem
            key={sub.id}
            label={sub.name}
            description={sub.description}
            checked={visibleIds.has(`${parent.id}.${sub.id}`)}
            indented
            labelMl={0}
            onToggle={() =>
              toggleSubRasterLayerVisibility(resolvedHazardsMapId, parent.id, sub.id)
            }
          />
        ))}
      </LayerToggleGroup>
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
            if (section.kind === "layer") return renderHazardParent(section.layer);
            const expandKey = hazardMenuGroupExpandKey(section.label);
            const group = HAZARD_MENU_GROUPS.find((g) => g.label === section.label);
            return (
              <LayerToggleGroup
                key={expandKey}
                label={section.label}
                icon={group?.icon}
                color={group?.color}
                className={styles["layer-toggle--group"]}
                description={group?.description}
                expanded={expandedHazards[expandKey] ?? false}
                onToggleExpand={() => toggleExpand(expandKey)}
                childrenPl={0}
              >
                {section.layers.map(renderHazardParent)}
              </LayerToggleGroup>
            );
          })}
          {rasterLayerConfigs.length > 0 && (
            <LayerToggleGroup
              label={rasterGroup.label}
              icon={rasterGroup.icon}
              color={rasterGroup.color}
              className={styles["layer-toggle--group"]}
              description={rasterGroup.description}
              expanded={expandedHazards[hazardMenuGroupExpandKey(rasterGroup.label)] ?? false}
              onToggleExpand={() => toggleExpand(hazardMenuGroupExpandKey(rasterGroup.label))}
              childrenPl={0}
            >
              {rasterLayerConfigs.map(renderRasterParent)}
            </LayerToggleGroup>
          )}
        </Stack>
      )}
    </MenuShell>
  );
};
