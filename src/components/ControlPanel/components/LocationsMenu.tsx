import React, { useMemo, useState } from "react";
import { Stack } from "@mui/material";
import { useMapStore, usePointLayerStore } from "../../../stores";
import { MenuShell } from "./MenuShell";
import { MapTabSelector } from "./MapTabSelector";
import { LayerToggleItem } from "./LayerToggleItem";
import { useResolvedMapId } from "../hooks/useResolvedMapId";

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
  const visiblePointLayerIdsByMap = usePointLayerStore((s) => s.visibleLayerIdsByMap);
  const togglePointLayerVisibility = usePointLayerStore((s) => s.toggleLayerVisibility);

  const visibleMaps = useMemo(() => mapConfigs.filter((c) => c.visible), [mapConfigs]);
  const [locationsMapId, setLocationsMapId] = useState<string>("");
  const resolvedLocationsMapId = useResolvedMapId(locationsMapId, visibleMaps, primaryMapId);

  return (
    <MenuShell
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      title="Secondary Environmental Risk Areas"
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
            .filter((l) => l.id === "sewage")
            .map((layer) => (
              <LayerToggleItem
                key={layer.id}
                label={layer.name}
                description={layer.description}
                icon={layer.icon}
                color={layer.color}
                checked={visiblePointLayerIdsByMap[resolvedLocationsMapId]?.has(layer.id) ?? false}
                onToggle={() => togglePointLayerVisibility(resolvedLocationsMapId, layer.id)}
              />
            ))}
        </Stack>
      )}
    </MenuShell>
  );
};
