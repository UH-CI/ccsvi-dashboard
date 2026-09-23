import React, { useMemo, useState } from "react";
import { Stack } from "@mui/material";
import { useMapStore, usePointLayerStore, useHazardLayersStore } from "../../../stores";
import { MenuShell } from "./MenuShell";
import { MapTabSelector } from "./MapTabSelector";
import { LayerToggleItem } from "./LayerToggleItem";
import { useResolvedMapId } from "../hooks/useResolvedMapId";
import { buildHazardMenuSections } from "../../../utils/hazardMenuSections";
import type { HazardMenuSection } from "../../../utils/hazardMenuSections";

interface LocationsMenuProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onInfoClick: (e: React.MouseEvent<HTMLElement>) => void;
}

export const LocationsMenu: React.FC<LocationsMenuProps> = ({
  open,
  anchorEl,
  onClose,
  onInfoClick,
}) => {
  const mapConfigs = useMapStore((s) => s.mapConfigs);
  const primaryMapId = useMapStore((s) => s.primaryMapId);
  const pointLayerConfigs = usePointLayerStore((s) => s.pointLayerConfigs);
  const hazardLayerConfigs = useHazardLayersStore((s) => s.hazardLayerConfigs);
  const visiblePointLayerIdsByMap = usePointLayerStore((s) => s.visibleLayerIdsByMap);
  const visibleHazardLayerIdsByMap = useHazardLayersStore((s) => s.visibleLayerIdsByMap);
  const togglePointLayerVisibility = usePointLayerStore((s) => s.toggleLayerVisibility);
  const toggleHazardLayerVisibility = useHazardLayersStore((s) => s.toggleHazardLayerVisibility);

  const visibleMaps = useMemo(() => mapConfigs.filter((c) => c.visible), [mapConfigs]);
  const [locationsMapId, setLocationsMapId] = useState<string>("");
  const resolvedLocationsMapId = useResolvedMapId(locationsMapId, visibleMaps, primaryMapId);

  const hazardMenuSections = useMemo(
    () => buildHazardMenuSections(hazardLayerConfigs, "locations"),
    [hazardLayerConfigs],
  );

  const renderHazardLayer = (section: HazardMenuSection) => {
    if (section.kind === "group") {
      return (
        <div key={section.label}>
          <strong>{section.label}</strong>
          <Stack spacing={1} sx={{ ml: 2 }}>
            {section.layers.map((layer) => (
              <LayerToggleItem
                key={layer.id}
                label={layer.name}
                icon={layer.icon}
                color={layer.color}
                checked={visibleHazardLayerIdsByMap[resolvedLocationsMapId]?.has(layer.id) ?? false}
                onToggle={() => toggleHazardLayerVisibility(resolvedLocationsMapId, layer.id)}
              />
            ))}
          </Stack>
        </div>
      );
    }

    return (
      <LayerToggleItem
        key={section.layer.id}
        label={section.layer.name}
        icon={section.layer.icon}
        color={section.layer.color}
        checked={visibleHazardLayerIdsByMap[resolvedLocationsMapId]?.has(section.layer.id) ?? false}
        onToggle={() => toggleHazardLayerVisibility(resolvedLocationsMapId, section.layer.id)}
      />
    );
  };

  return (
    <MenuShell
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      title="Locations of Enhanced Exposure"
      onInfoClick={onInfoClick}
    >
      <MapTabSelector
        mapConfigs={visibleMaps}
        selectedMapId={resolvedLocationsMapId}
        onChange={setLocationsMapId}
      />
      {resolvedLocationsMapId && (
        <Stack spacing={1}>
          {pointLayerConfigs
            .filter((l) => l.id === "sewage" || l.id === "wastewater_plant")
            .map((layer) => (
              <LayerToggleItem
                key={layer.id}
                label={layer.name}
                icon={layer.icon}
                color={layer.color}
                checked={visiblePointLayerIdsByMap[resolvedLocationsMapId]?.has(layer.id) ?? false}
                onToggle={() => togglePointLayerVisibility(resolvedLocationsMapId, layer.id)}
              />
            ))}
          {hazardMenuSections.map((section) => renderHazardLayer(section))}
        </Stack>
      )}
    </MenuShell>
  );
};
