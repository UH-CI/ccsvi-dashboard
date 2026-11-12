import React, { useMemo, useState } from "react";
import { Stack } from "@mui/material";
import type * as FaIcons from "react-icons/fa";
import { useMapStore } from "../../../stores/useMapStore";
import { useMapLayersStore, useVisibleIds } from "../../../stores/useMapLayersStore";
import styles from "../ControlPanel.module.scss";
import { MenuShell } from "./MenuShell";
import { MapTabSelector } from "./MapTabSelector";
import { LayerToggleItem } from "./LayerToggleItem";
import { LayerToggleGroup } from "./LayerToggleGroup";
import { useResolvedMapId } from "../hooks/useResolvedMapId";
import type { LayerMenu as LayerMenuConfig } from "../../../config/layerMenus";
import { subLayerId } from "../../../config/layerFiles";
import { resolveLayerMenu } from "../../../utils/layerMenus";
import type { LayerKind, MenuGroupEntry, MenuLayer } from "../../../utils/layerMenus";

interface LayerMenuProps {
  menu: LayerMenuConfig;
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onInfoClick: (e: React.MouseEvent<HTMLElement>) => void;
}

// What a menu row does, per kind of layer; only kinds with sub-layers have toggleSub
const MENU_ACTIONS: Record<
  LayerKind,
  {
    fallbackIcon?: keyof typeof FaIcons;
    toggle: (mapId: string, id: string) => void;
    toggleSub?: (mapId: string, parentId: string, subId: string) => void;
  }
> = {
  point: { toggle: (mapId, id) => useMapLayersStore.getState().togglePoint(mapId, id) },
  shape: {
    fallbackIcon: "FaExclamationTriangle",
    toggle: (mapId, id) => useMapLayersStore.getState().toggleHazard(mapId, id),
    toggleSub: (mapId, parentId, subId) =>
      useMapLayersStore.getState().toggleHazardSub(mapId, parentId, subId),
  },
  raster: {
    fallbackIcon: "FaMap",
    toggle: (mapId, id) => useMapLayersStore.getState().toggleRaster(mapId, id),
    toggleSub: (mapId, parentId, subId) =>
      useMapLayersStore.getState().toggleRaster(mapId, subLayerId(parentId, subId)),
  },
};

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
  const maps = useMapStore((s) => s.maps);
  const primaryMapId = useMapStore((s) => s.primaryMapId);

  const visibleMaps = useMemo(() => maps.filter((c) => c.visible), [maps]);
  const [preferredMapId, setPreferredMapId] = useState<string>("");
  const mapId = useResolvedMapId(preferredMapId, visibleMaps, primaryMapId);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const toggleExpand = (key: string) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const entries = useMemo(() => resolveLayerMenu(menu), [menu]);
  const visible = useVisibleIds(mapId);
  const hide = menu.hideCheckboxes ?? false;

  const renderLayer = (entry: MenuLayer, indented = false) => {
    const { layer } = entry;
    const { fallbackIcon, toggle, toggleSub } = MENU_ACTIONS[entry.kind];
    const visibleIds = visible[entry.kind];
    const toggleLayer = () => toggle(mapId, layer.id);

    // A point layer has no sub-layers
    if (entry.kind === "point" || !entry.layer.subLayers?.length) {
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

    const { subLayers } = entry.layer;
    const visibleSubCount = subLayers.filter((sub) =>
      visibleIds.has(subLayerId(layer.id, sub.id)),
    ).length;
    const allSubsVisible = visibleSubCount === subLayers.length;
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
        {subLayers.map((sub) => (
          <LayerToggleItem
            key={sub.id}
            label={sub.name}
            description={sub.description}
            checked={visibleIds.has(subLayerId(layer.id, sub.id))}
            indented
            labelMl={hide ? 0 : undefined}
            onToggle={() => toggleSub!(mapId, layer.id, sub.id)}
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

    // Select-all covers the group's layers except rasters, since a map shows only one raster
    const selectable = layers.filter((l) => l.kind !== "raster");
    const isOn = (l: MenuLayer) => visible[l.kind].has(l.layer.id);
    const visibleCount = selectable.filter(isOn).length;
    const allVisible = visibleCount === selectable.length;
    return (
      <LayerToggleGroup
        key={expandKey}
        {...groupProps}
        selectAll={{
          checked: allVisible,
          indeterminate: visibleCount > 0 && !allVisible,
          // All on: turn them all off. Otherwise: turn the rest on.
          onToggle: () =>
            selectable
              .filter((l) => isOn(l) === allVisible)
              .forEach((l) => MENU_ACTIONS[l.kind].toggle(mapId, l.layer.id)),
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
      <MapTabSelector maps={visibleMaps} selectedMapId={mapId} onChange={setPreferredMapId} />
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
