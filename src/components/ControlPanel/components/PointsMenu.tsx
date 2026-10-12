import React, { useMemo, useState } from "react";
import { Stack } from "@mui/material";
import { useMapStore, usePointLayerStore, useHazardLayersStore } from "../../../stores";
import { MenuShell } from "./MenuShell";
import { MapTabSelector } from "./MapTabSelector";
import { LayerToggleItem } from "./LayerToggleItem";
import { LayerToggleGroup } from "./LayerToggleGroup";
import { useResolvedMapId } from "../hooks/useResolvedMapId";
import type { HazardLayerConfig, PointLayerConfig } from "../../../types";
import { buildMenuSections, hazardMenuGroupExpandKey } from "../../../utils/hazardMenuSections";
import type { MenuSection } from "../../../utils/hazardMenuSections";

interface PointsMenuProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onInfoClick: (e: React.MouseEvent<HTMLElement>) => void;
}

export const PointsMenu: React.FC<PointsMenuProps> = ({ open, anchorEl, onClose, onInfoClick }) => {
  const mapConfigs = useMapStore((s) => s.mapConfigs);
  const primaryMapId = useMapStore((s) => s.primaryMapId);
  const pointLayerConfigs = usePointLayerStore((s) => s.pointLayerConfigs);
  const visiblePointLayerIdsByMap = usePointLayerStore((s) => s.visibleLayerIdsByMap);
  const togglePointLayerVisibility = usePointLayerStore((s) => s.toggleLayerVisibility);
  const hazardLayerConfigs = useHazardLayersStore((s) => s.hazardLayerConfigs);
  const visibleHazardLayerIdsByMap = useHazardLayersStore((s) => s.visibleLayerIdsByMap);
  const toggleHazardLayerVisibility = useHazardLayersStore((s) => s.toggleHazardLayerVisibility);
  const toggleSubLayerVisibility = useHazardLayersStore((s) => s.toggleSubLayerVisibility);

  const visibleMaps = useMemo(() => mapConfigs.filter((c) => c.visible), [mapConfigs]);
  const [pointsMapId, setPointsMapId] = useState<string>("");
  const resolvedPointsMapId = useResolvedMapId(pointsMapId, visibleMaps, primaryMapId);
  const [expandedPoints, setExpandedPoints] = useState<Record<string, boolean>>({});
  const toggleExpand = (key: string) =>
    setExpandedPoints((prev) => ({ ...prev, [key]: !prev[key] }));

  const pointSections = useMemo(
    () => buildMenuSections(pointLayerConfigs.filter((l) => l.menu === "criticalInfrastructure")),
    [pointLayerConfigs],
  );
  const hazardLayers = useMemo(
    () => hazardLayerConfigs.filter((l) => l.menuPanel === "points"),
    [hazardLayerConfigs],
  );

  const visiblePointIds = visiblePointLayerIdsByMap[resolvedPointsMapId] ?? new Set<string>();
  const visibleHazardIds = visibleHazardLayerIdsByMap[resolvedPointsMapId] ?? new Set<string>();

  const pointMenuGroups = new Set(
    pointSections.flatMap((section) => (section.kind === "group" ? [section.label] : [])),
  );

  const renderPointLayer = (layer: PointLayerConfig, indented = false) => (
    <LayerToggleItem
      key={layer.id}
      label={layer.name}
      description={layer.description}
      icon={layer.icon}
      color={layer.color}
      indented={indented}
      checked={visiblePointIds.has(layer.id)}
      onToggle={() => togglePointLayerVisibility(resolvedPointsMapId, layer.id)}
    />
  );

  const renderPointGroup = (section: Extract<MenuSection<PointLayerConfig>, { kind: "group" }>) => {
    const groupedHazardLayers = hazardLayers.filter((layer) => layer.menuGroup === section.label);
    const pointLayerVisible = section.layers.map((layer) => visiblePointIds.has(layer.id));
    const hazardLayerVisible = groupedHazardLayers.map((layer) => visibleHazardIds.has(layer.id));
    const sourceVisibility = [...pointLayerVisible, ...hazardLayerVisible];
    const visibleCount = sourceVisibility.filter(Boolean).length;
    const allVisible = sourceVisibility.length > 0 && visibleCount === sourceVisibility.length;
    const expandKey = hazardMenuGroupExpandKey(section.label);
    return (
      <LayerToggleGroup
        key={expandKey}
        label={section.label}
        icon={section.layers[0]?.icon ?? groupedHazardLayers[0]?.icon}
        color={section.layers[0]?.color ?? groupedHazardLayers[0]?.color}
        expanded={expandedPoints[expandKey] ?? false}
        onToggleExpand={() => toggleExpand(expandKey)}
        selectAll={{
          checked: allVisible,
          indeterminate: visibleCount > 0 && !allVisible,
          onToggle: () => {
            const shouldShow = !allVisible;
            section.layers.forEach((layer) => {
              if (visiblePointIds.has(layer.id) !== shouldShow) {
                togglePointLayerVisibility(resolvedPointsMapId, layer.id);
              }
            });
            groupedHazardLayers.forEach((layer) => {
              if (visibleHazardIds.has(layer.id) !== shouldShow) {
                toggleHazardLayerVisibility(resolvedPointsMapId, layer.id);
              }
            });
          },
        }}
      >
        {section.layers.map((layer) => renderPointLayer(layer, true))}
        {groupedHazardLayers.map(renderHazardLayer)}
      </LayerToggleGroup>
    );
  };

  const renderHazardLayer = (layer: HazardLayerConfig) => {
    const toggleLayer = () => toggleHazardLayerVisibility(resolvedPointsMapId, layer.id);

    if (!layer.subLayers?.length) {
      return (
        <LayerToggleItem
          key={layer.id}
          label={layer.name}
          description={layer.description}
          icon={layer.icon}
          color={layer.color}
          checked={visibleHazardIds.has(layer.id)}
          onToggle={toggleLayer}
        />
      );
    }

    const visibleSubCount = layer.subLayers.filter((sub) =>
      visibleHazardIds.has(`${layer.id}.${sub.id}`),
    ).length;
    const allSubVisible = visibleSubCount === layer.subLayers.length;
    return (
      <LayerToggleGroup
        key={layer.id}
        label={layer.name}
        description={layer.description}
        icon={layer.icon}
        color={layer.color}
        expanded={expandedPoints[layer.id] ?? false}
        onToggleExpand={() => toggleExpand(layer.id)}
        selectAll={{
          checked: allSubVisible,
          indeterminate: visibleSubCount > 0 && !allSubVisible,
          onToggle: toggleLayer,
        }}
      >
        {layer.subLayers.map((sub) => (
          <LayerToggleItem
            key={sub.id}
            label={sub.name}
            description={sub.description}
            checked={visibleHazardIds.has(`${layer.id}.${sub.id}`)}
            indented
            onToggle={() => toggleSubLayerVisibility(resolvedPointsMapId, layer.id, sub.id)}
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
      title="Critical Infrastructure"
      onInfoClick={onInfoClick}
    >
      <MapTabSelector
        mapConfigs={visibleMaps}
        selectedMapId={resolvedPointsMapId}
        onChange={setPointsMapId}
      />
      {resolvedPointsMapId && (
        <Stack spacing={1}>
          {pointSections.map((section) =>
            section.kind === "layer" ? renderPointLayer(section.layer) : renderPointGroup(section),
          )}
          {hazardLayers
            .filter((layer) => !pointMenuGroups.has(layer.menuGroup ?? ""))
            .map(renderHazardLayer)}
        </Stack>
      )}
    </MenuShell>
  );
};
