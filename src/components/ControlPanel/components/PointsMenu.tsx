import React, { useMemo, useState } from "react";
import { Stack } from "@mui/material";
import { useMapStore, usePointLayerStore, useHazardLayersStore } from "../../../stores";
import { MenuShell } from "./MenuShell";
import { MapTabSelector } from "./MapTabSelector";
import { LayerToggleItem } from "./LayerToggleItem";
import { LayerToggleGroup } from "./LayerToggleGroup";
import { useResolvedMapId } from "../hooks/useResolvedMapId";

const SCHOOL_IDS = ["preschools", "public_schools", "private_schools"];

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
      {resolvedPointsMapId &&
        (() => {
          const visibleIds = visiblePointLayerIdsByMap[resolvedPointsMapId];
          const visibleSchoolCount = SCHOOL_IDS.filter((id) => visibleIds?.has(id)).length;
          const allSchoolsVisible = visibleSchoolCount === SCHOOL_IDS.length;
          const someSchoolsVisible = visibleSchoolCount > 0 && !allSchoolsVisible;

          const handleToggleAllSchools = () => {
            if (allSchoolsVisible) {
              SCHOOL_IDS.filter((id) => visibleIds?.has(id)).forEach((id) =>
                togglePointLayerVisibility(resolvedPointsMapId, id),
              );
            } else {
              SCHOOL_IDS.filter((id) => !visibleIds?.has(id)).forEach((id) =>
                togglePointLayerVisibility(resolvedPointsMapId, id),
              );
            }
          };

          return (
            <Stack spacing={1}>
              {pointLayerConfigs
                .filter((l) => !SCHOOL_IDS.includes(l.id) && l.id !== "sewage")
                .map((layer) => (
                  <LayerToggleItem
                    key={layer.id}
                    label={layer.name}
                    icon={layer.icon}
                    color={layer.color}
                    checked={visibleIds?.has(layer.id) ?? false}
                    onToggle={() => togglePointLayerVisibility(resolvedPointsMapId, layer.id)}
                  />
                ))}

              {/* Sidewalks and Paths (from hazard layers) */}
              {(() => {
                const layer = hazardLayerConfigs.find((l) => l.id === "sidewalks_and_paths");
                if (!layer) return null;
                const isVisible =
                  visibleHazardLayerIdsByMap[resolvedPointsMapId]?.has(layer.id) ?? false;
                return (
                  <LayerToggleItem
                    label={layer.name}
                    icon={layer.icon}
                    color={layer.color}
                    checked={isVisible}
                    onToggle={() => toggleHazardLayerVisibility(resolvedPointsMapId, layer.id)}
                  />
                );
              })()}

              {/* State Roads with island sub-layers */}
              {(() => {
                const roadsLayer = hazardLayerConfigs.find((l) => l.id === "state_roads");
                if (!roadsLayer?.subLayers) return null;
                const visibleSubCount = roadsLayer.subLayers.filter((sub) =>
                  visibleHazardLayerIdsByMap[resolvedPointsMapId]?.has(`state_roads.${sub.id}`),
                ).length;
                const allSubVisible = visibleSubCount === roadsLayer.subLayers.length;
                const someSubVisible = visibleSubCount > 0 && !allSubVisible;
                return (
                  <LayerToggleGroup
                    label={roadsLayer.name}
                    icon={roadsLayer.icon}
                    color={roadsLayer.color}
                    expanded={expandedPoints.state_roads ?? false}
                    onToggleExpand={() =>
                      setExpandedPoints((prev) => ({ ...prev, state_roads: !prev.state_roads }))
                    }
                    selectAll={{
                      checked: allSubVisible,
                      indeterminate: someSubVisible,
                      onToggle: () =>
                        toggleHazardLayerVisibility(resolvedPointsMapId, roadsLayer.id),
                    }}
                  >
                    {roadsLayer.subLayers.map((sub) => {
                      const compositeId = `state_roads.${sub.id}`;
                      const isSubVisible =
                        visibleHazardLayerIdsByMap[resolvedPointsMapId]?.has(compositeId) ?? false;
                      return (
                        <LayerToggleItem
                          key={sub.id}
                          label={sub.name}
                          checked={isSubVisible}
                          indented
                          onToggle={() =>
                            toggleSubLayerVisibility(resolvedPointsMapId, roadsLayer.id, sub.id)
                          }
                        />
                      );
                    })}
                  </LayerToggleGroup>
                );
              })()}

              {/* Schools group */}
              <LayerToggleGroup
                label="Schools"
                expanded={expandedPoints.schools ?? false}
                onToggleExpand={() =>
                  setExpandedPoints((prev) => ({ ...prev, schools: !prev.schools }))
                }
                selectAll={{
                  checked: allSchoolsVisible,
                  indeterminate: someSchoolsVisible,
                  onToggle: handleToggleAllSchools,
                }}
              >
                {pointLayerConfigs
                  .filter((l) => SCHOOL_IDS.includes(l.id))
                  .map((layer) => (
                    <LayerToggleItem
                      key={layer.id}
                      label={layer.name}
                      icon={layer.icon}
                      color={layer.color}
                      indented
                      checked={visibleIds?.has(layer.id) ?? false}
                      onToggle={() => togglePointLayerVisibility(resolvedPointsMapId, layer.id)}
                    />
                  ))}
              </LayerToggleGroup>
            </Stack>
          );
        })()}
    </MenuShell>
  );
};
