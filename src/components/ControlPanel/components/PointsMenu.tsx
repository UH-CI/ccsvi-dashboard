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
  const pointGroupLabels = new Set(
    pointSections.flatMap((s) => (s.kind === "group" ? [s.label] : [])),
  );

  const visiblePointIds = visiblePointLayerIdsByMap[resolvedPointsMapId] ?? new Set<string>();
  const visibleHazardIds = visibleHazardLayerIdsByMap[resolvedPointsMapId] ?? new Set<string>();

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

  // A point group also holds the shape layers that share its menuGroup (e.g. airport grounds)
  const renderPointGroup = (section: Extract<MenuSection<PointLayerConfig>, { kind: "group" }>) => {
    const groupHazards = hazardLayers.filter((l) => l.menuGroup === section.label);
    const visibleCount =
      section.layers.filter((l) => visiblePointIds.has(l.id)).length +
      groupHazards.filter((l) => visibleHazardIds.has(l.id)).length;
    const allVisible = visibleCount === section.layers.length + groupHazards.length;
    const expandKey = hazardMenuGroupExpandKey(section.label);
    return (
      <LayerToggleGroup
        key={expandKey}
        label={section.label}
        expanded={expandedPoints[expandKey] ?? false}
        onToggleExpand={() => toggleExpand(expandKey)}
        selectAll={{
          checked: allVisible,
          indeterminate: visibleCount > 0 && !allVisible,
          // All on: turn them all off. Otherwise: turn the rest on.
          onToggle: () => {
            section.layers
              .filter((l) => visiblePointIds.has(l.id) === allVisible)
              .forEach((l) => togglePointLayerVisibility(resolvedPointsMapId, l.id));
            groupHazards
              .filter((l) => visibleHazardIds.has(l.id) === allVisible)
              .forEach((l) => toggleHazardLayerVisibility(resolvedPointsMapId, l.id));
          },
        }}
      >
        {section.layers.map((layer) => renderPointLayer(layer, true))}
        {groupHazards.map((layer) => renderHazardLayer(layer, true))}
      </LayerToggleGroup>
    );
  };

  const renderHazardLayer = (layer: HazardLayerConfig, indented = false) => {
    const toggleLayer = () => toggleHazardLayerVisibility(resolvedPointsMapId, layer.id);

    if (!layer.subLayers?.length) {
      return (
        <LayerToggleItem
          key={layer.id}
          label={layer.name}
          description={layer.description}
          icon={layer.icon}
          color={layer.color}
          indented={indented}
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
          {pointSections.map((s) => s.kind === "layer" && renderPointLayer(s.layer))}
          {hazardLayers
            .filter((l) => !pointGroupLabels.has(l.menuGroup ?? ""))
            .map((l) => renderHazardLayer(l))}
          {pointSections.map((s) => s.kind === "group" && renderPointGroup(s))}
        </Stack>
      )}
    </MenuShell>
  );
};
