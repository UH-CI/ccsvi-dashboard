import React, { useMemo, useState } from "react";
import { Stack } from "@mui/material";
import {
  useMapStore,
  usePointLayerStore,
  useHazardLayersStore,
  useRasterLayersStore,
} from "../../../stores";
import styles from "../ControlPanel.module.scss";
import { MenuShell } from "./MenuShell";
import { MapTabSelector } from "./MapTabSelector";
import { LayerToggleItem } from "./LayerToggleItem";
import { LayerToggleGroup } from "./LayerToggleGroup";
import { useResolvedMapId } from "../hooks/useResolvedMapId";
import type { LayerMenu as LayerMenuConfig } from "../../../config/layerMenus";
import { resolveLayerMenu } from "../../../utils/layerMenus";
import type { MenuGroupEntry, MenuLayer } from "../../../utils/layerMenus";

interface LayerMenuProps {
  menu: LayerMenuConfig;
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onInfoClick: (e: React.MouseEvent<HTMLElement>) => void;
}

const NO_IDS = new Set<string>();

// Groups and layers share one open/closed record; this keeps a group's entry apart from layer ids
const groupExpandKey = (label: string) => `__group__${label}`;

// Draws one menu from src/config/layerMenus.ts
export const LayerMenu: React.FC<LayerMenuProps> = ({
  menu,
  open,
  anchorEl,
  onClose,
  onInfoClick,
}) => {
  const mapConfigs = useMapStore((s) => s.mapConfigs);
  const primaryMapId = useMapStore((s) => s.primaryMapId);
  const pointLayerConfigs = usePointLayerStore((s) => s.pointLayerConfigs);
  const visiblePointIdsByMap = usePointLayerStore((s) => s.visibleLayerIdsByMap);
  const togglePointLayerVisibility = usePointLayerStore((s) => s.toggleLayerVisibility);
  const hazardLayerConfigs = useHazardLayersStore((s) => s.hazardLayerConfigs);
  const visibleShapeIdsByMap = useHazardLayersStore((s) => s.visibleLayerIdsByMap);
  const toggleHazardLayerVisibility = useHazardLayersStore((s) => s.toggleHazardLayerVisibility);
  const toggleSubLayerVisibility = useHazardLayersStore((s) => s.toggleSubLayerVisibility);
  const rasterLayerConfigs = useRasterLayersStore((s) => s.rasterLayerConfigs);
  const visibleRasterIdsByMap = useRasterLayersStore((s) => s.visibleLayerIdsByMap);
  const toggleRasterLayerVisibility = useRasterLayersStore((s) => s.toggleRasterLayerVisibility);
  const toggleSubRasterLayerVisibility = useRasterLayersStore(
    (s) => s.toggleSubRasterLayerVisibility,
  );

  const visibleMaps = useMemo(() => mapConfigs.filter((c) => c.visible), [mapConfigs]);
  const [preferredMapId, setPreferredMapId] = useState<string>("");
  const mapId = useResolvedMapId(preferredMapId, visibleMaps, primaryMapId);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleExpand = (key: string) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const entries = useMemo(
    () => resolveLayerMenu(menu, pointLayerConfigs, hazardLayerConfigs, rasterLayerConfigs),
    [menu, pointLayerConfigs, hazardLayerConfigs, rasterLayerConfigs],
  );

  const hide = menu.hideCheckboxes ?? false;
  const visiblePointIds = visiblePointIdsByMap[mapId] ?? NO_IDS;
  const visibleShapeIds = visibleShapeIdsByMap[mapId] ?? NO_IDS;
  const visibleRasterIds = visibleRasterIdsByMap[mapId] ?? NO_IDS;

  const renderLayer = (entry: MenuLayer, indented = false) => {
    if (entry.kind === "point") {
      const { layer } = entry;
      return (
        <LayerToggleItem
          key={layer.id}
          label={layer.name}
          description={layer.description}
          icon={layer.icon}
          color={layer.color}
          indented={indented}
          checked={visiblePointIds.has(layer.id)}
          onToggle={() => togglePointLayerVisibility(mapId, layer.id)}
          hideCheckbox={hide}
        />
      );
    }

    const { layer } = entry;
    const isShape = entry.kind === "shape";
    const visibleIds = isShape ? visibleShapeIds : visibleRasterIds;
    const fallbackIcon = isShape ? "FaExclamationTriangle" : "FaMap";
    const toggleLayer = () =>
      isShape
        ? toggleHazardLayerVisibility(mapId, layer.id)
        : toggleRasterLayerVisibility(mapId, layer.id);

    if (!layer.subLayers?.length) {
      return (
        <LayerToggleItem
          key={layer.id}
          label={layer.name}
          description={layer.description}
          icon={layer.icon}
          color={layer.color}
          fallbackIcon={fallbackIcon}
          indented={indented}
          checked={visibleIds.has(layer.id)}
          onToggle={toggleLayer}
          hideCheckbox={hide}
        />
      );
    }

    const visibleSubCount = layer.subLayers.filter((sub) =>
      visibleIds.has(`${layer.id}.${sub.id}`),
    ).length;
    const allSubsVisible = visibleSubCount === layer.subLayers.length;
    return (
      <LayerToggleGroup
        key={layer.id}
        label={layer.name}
        description={layer.description}
        icon={layer.icon}
        color={layer.color}
        fallbackIcon={fallbackIcon}
        expanded={expanded[layer.id] ?? false}
        onToggleExpand={() => toggleExpand(layer.id)}
        selectAll={{
          checked: allSubsVisible,
          indeterminate: visibleSubCount > 0 && !allSubsVisible,
          onToggle: toggleLayer,
        }}
        hideCheckbox={hide}
        childrenPl={hide ? 7 : undefined}
      >
        {layer.subLayers.map((sub) => (
          <LayerToggleItem
            key={sub.id}
            label={sub.name}
            description={sub.description}
            checked={visibleIds.has(`${layer.id}.${sub.id}`)}
            indented
            labelMl={hide ? 0 : undefined}
            onToggle={() =>
              isShape
                ? toggleSubLayerVisibility(mapId, layer.id, sub.id)
                : toggleSubRasterLayerVisibility(mapId, layer.id, sub.id)
            }
          />
        ))}
      </LayerToggleGroup>
    );
  };

  const renderGroup = (entry: MenuGroupEntry) => {
    const { group, layers } = entry;
    const expandKey = groupExpandKey(group.group);
    const groupProps = {
      label: group.group,
      description: group.description,
      icon: group.icon ?? layers[0].layer.icon,
      color: group.color ?? layers[0].layer.color,
      expanded: expanded[expandKey] ?? false,
      onToggleExpand: () => toggleExpand(expandKey),
    };
    const children = layers.map((layer) => renderLayer(layer, true));

    if (hide) {
      return (
        <LayerToggleGroup
          key={expandKey}
          {...groupProps}
          className={styles["layer-toggle--group"]}
          childrenPl={0}
        >
          {children}
        </LayerToggleGroup>
      );
    }

    // Select-all covers the group's point and shape layers
    const points = layers.flatMap((l) => (l.kind === "point" ? [l.layer] : []));
    const shapes = layers.flatMap((l) => (l.kind === "shape" ? [l.layer] : []));
    const visibleCount =
      points.filter((l) => visiblePointIds.has(l.id)).length +
      shapes.filter((l) => visibleShapeIds.has(l.id)).length;
    const allVisible = visibleCount === points.length + shapes.length;
    return (
      <LayerToggleGroup
        key={expandKey}
        {...groupProps}
        selectAll={{
          checked: allVisible,
          indeterminate: visibleCount > 0 && !allVisible,
          // All on: turn them all off. Otherwise: turn the rest on.
          onToggle: () => {
            points
              .filter((l) => visiblePointIds.has(l.id) === allVisible)
              .forEach((l) => togglePointLayerVisibility(mapId, l.id));
            shapes
              .filter((l) => visibleShapeIds.has(l.id) === allVisible)
              .forEach((l) => toggleHazardLayerVisibility(mapId, l.id));
          },
        }}
      >
        {children}
      </LayerToggleGroup>
    );
  };

  return (
    <MenuShell
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      title={menu.popupTitle ?? menu.title}
      onInfoClick={onInfoClick}
    >
      <MapTabSelector mapConfigs={visibleMaps} selectedMapId={mapId} onChange={setPreferredMapId} />
      {mapId && (
        <Stack spacing={1}>
          {entries.map((entry) =>
            entry.kind === "group" ? renderGroup(entry) : renderLayer(entry),
          )}
        </Stack>
      )}
    </MenuShell>
  );
};
