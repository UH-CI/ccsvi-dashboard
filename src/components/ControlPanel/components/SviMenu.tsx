import React, { useCallback, useMemo, useState } from "react";
import { Stack } from "@mui/material";
import { useMapStore } from "../../../stores";
import { SVI_CATEGORIES } from "../../../config";
import { MenuShell } from "./MenuShell";
import { MapTabSelector } from "./MapTabSelector";
import { LayerToggleGroup } from "./LayerToggleGroup";
import { LayerToggleItem } from "./LayerToggleItem";
import { ComparisonMetricSelect } from "./ComparisonMetricSelect";
import { useResolvedMapId } from "../hooks/useResolvedMapId";

interface SviMenuProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onInfoClick: (e: React.MouseEvent<HTMLElement>) => void;
}

export const SviMenu: React.FC<SviMenuProps> = ({ open, anchorEl, onClose, onInfoClick }) => {
  const mapConfigs = useMapStore((s) => s.mapConfigs);
  const primaryMapId = useMapStore((s) => s.primaryMapId);
  const updateMapConfig = useMapStore((s) => s.updateMapConfig);

  const visibleMaps = useMemo(() => mapConfigs.filter((c) => c.visible), [mapConfigs]);
  const [sviMapId, setSviMapId] = useState<string>("");
  const resolvedSviMapId = useResolvedMapId(sviMapId, visibleMaps, primaryMapId);

  const [expandedSvi, setExpandedSvi] = useState<Record<string, boolean>>({});
  const toggleExpandSvi = useCallback(
    (id: string) => setExpandedSvi((prev) => ({ ...prev, [id]: !prev[id] })),
    [],
  );

  const sviConfig = mapConfigs.find((c) => c.id === resolvedSviMapId);
  const activeSviCategoryId = SVI_CATEGORIES.find((cat) =>
    cat.indicators.some((ind) => ind.key === sviConfig?.metric),
  )?.id;

  return (
    <MenuShell
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      title="Social Vulnerability Indicators"
      onInfoClick={onInfoClick}
    >
      <MapTabSelector
        mapConfigs={visibleMaps}
        selectedMapId={resolvedSviMapId}
        onChange={setSviMapId}
      />
      {resolvedSviMapId && (
        <Stack spacing={1}>
          {SVI_CATEGORIES.map((category) => {
            const isExpanded = expandedSvi[category.id] ?? category.id === activeSviCategoryId;
            return (
              <LayerToggleGroup
                key={category.id}
                label={category.label}
                description={category.description}
                expanded={isExpanded}
                onToggleExpand={() => toggleExpandSvi(category.id)}
              >
                {category.indicators.map((indicator) => {
                  const isSelected = sviConfig?.metric === indicator.key;
                  return (
                    <LayerToggleItem
                      key={indicator.key}
                      label={indicator.label}
                      checked={isSelected}
                      indented
                      description={indicator.description}
                      onToggle={() =>
                        updateMapConfig(resolvedSviMapId, {
                          metric: isSelected ? "" : indicator.key,
                          metric2: undefined,
                        })
                      }
                    />
                  );
                })}
              </LayerToggleGroup>
            );
          })}
          {sviConfig?.metric && (
            <ComparisonMetricSelect
              metric={sviConfig.metric}
              metric2={sviConfig.metric2}
              onChange={(next) => updateMapConfig(resolvedSviMapId, next)}
            />
          )}
        </Stack>
      )}
    </MenuShell>
  );
};
