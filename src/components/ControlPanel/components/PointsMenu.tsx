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
  const sharedLayerGroups = Array.from(
    new Set([
      ...pointLayerConfigs.map((layer) => layer.menuGroup),
      ...hazardLayerConfigs
        .filter((layer) => layer.menuPanel === "points")
        .map((layer) => layer.menuGroup),
    ].filter((group): group is string => Boolean(group))),
  ).map((group) => {
    const pointLayers = pointLayerConfigs.filter((layer) => layer.menuGroup === group);
    const hazardLayers = hazardLayerConfigs.filter(
      (layer) => layer.menuPanel === "points" && layer.menuGroup === group,
    );
    const firstLayer = pointLayers[0] ?? hazardLayers[0];

    return {
      id: group,
      name: firstLayer?.name ?? group,
      icon: firstLayer?.icon,
      color: firstLayer?.color,
      pointLayers,
      hazardLayers,
    };
  });

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
                .filter(
                  (l) =>
                    !l.menuGroup &&
                    !SCHOOL_IDS.includes(l.id) &&
                    l.id !== "sewage" &&
                    l.id !== "wastewater_plant",
                )
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

              {hazardLayerConfigs
                .filter((layer) => layer.menuPanel === "points" && !layer.menuGroup)
                .map((layer) => {
                  const visibleLayerIds = visibleHazardLayerIdsByMap[resolvedPointsMapId];

                  if (layer.subLayers?.length) {
                    const visibleSubCount = layer.subLayers.filter((sub) =>
                      visibleLayerIds?.has(`${layer.id}.${sub.id}`),
                    ).length;
                    const allSubVisible = visibleSubCount === layer.subLayers.length;
                    const someSubVisible = visibleSubCount > 0 && !allSubVisible;

                    return (
                      <LayerToggleGroup
                        key={layer.id}
                        label={layer.name}
                        icon={layer.icon}
                        color={layer.color}
                        expanded={expandedPoints[layer.id] ?? false}
                        onToggleExpand={() =>
                          setExpandedPoints((prev) => ({ ...prev, [layer.id]: !prev[layer.id] }))
                        }
                        selectAll={{
                          checked: allSubVisible,
                          indeterminate: someSubVisible,
                          onToggle: () => toggleHazardLayerVisibility(resolvedPointsMapId, layer.id),
                        }}
                      >
                        {layer.subLayers.map((sub) => {
                          const compositeId = `${layer.id}.${sub.id}`;
                          return (
                            <LayerToggleItem
                              key={sub.id}
                              label={sub.name}
                              checked={visibleLayerIds?.has(compositeId) ?? false}
                              indented
                              onToggle={() =>
                                toggleSubLayerVisibility(resolvedPointsMapId, layer.id, sub.id)
                              }
                            />
                          );
                        })}
                      </LayerToggleGroup>
                    );
                  }

                  return (
                    <LayerToggleItem
                      key={layer.id}
                      label={layer.name}
                      icon={layer.icon}
                      color={layer.color}
                      checked={visibleLayerIds?.has(layer.id) ?? false}
                      onToggle={() => toggleHazardLayerVisibility(resolvedPointsMapId, layer.id)}
                    />
                  );
                })}

              {sharedLayerGroups.map((group) => {
                const visiblePointIds = visiblePointLayerIdsByMap[resolvedPointsMapId];
                const visibleHazardIds = visibleHazardLayerIdsByMap[resolvedPointsMapId];
                const sourceVisibility = [
                  ...group.pointLayers.map((layer) => visiblePointIds?.has(layer.id) ?? false),
                  ...group.hazardLayers.map((layer) => visibleHazardIds?.has(layer.id) ?? false),
                ];
                const allVisible = sourceVisibility.length > 0 && sourceVisibility.every(Boolean);
                const someVisible = sourceVisibility.some(Boolean) && !allVisible;

                return (
                  <LayerToggleItem
                    key={group.id}
                    label={group.name}
                    icon={group.icon}
                    color={group.color}
                    checked={allVisible}
                    indeterminate={someVisible}
                    onToggle={() => {
                      const shouldShow = !allVisible;
                      group.pointLayers.forEach((layer) => {
                        if ((visiblePointIds?.has(layer.id) ?? false) !== shouldShow) {
                          togglePointLayerVisibility(resolvedPointsMapId, layer.id);
                        }
                      });
                      group.hazardLayers.forEach((layer) => {
                        if ((visibleHazardIds?.has(layer.id) ?? false) !== shouldShow) {
                          toggleHazardLayerVisibility(resolvedPointsMapId, layer.id);
                        }
                      });
                    }}
                  />
                );
              })}

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
