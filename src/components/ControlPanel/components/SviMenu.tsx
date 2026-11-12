import React, { useCallback, useMemo, useState } from "react";
import { Stack } from "@mui/material";
import { useMapStore } from "../../../stores/useMapStore";
import { SVI_CATEGORIES } from "../../../config/sviCategories";
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
  const maps = useMapStore((s) => s.maps);
  const primaryMapId = useMapStore((s) => s.primaryMapId);
  const updateMap = useMapStore((s) => s.updateMap);

  const visibleMaps = useMemo(() => maps.filter((c) => c.visible), [maps]);
  const [sviMapId, setSviMapId] = useState<string>("");
  const resolvedSviMapId = useResolvedMapId(sviMapId, visibleMaps, primaryMapId);

  const [expandedSvi, setExpandedSvi] = useState<Record<string, boolean>>({});
  const toggleExpandSvi = useCallback(
    (id: string) => setExpandedSvi((prev) => ({ ...prev, [id]: !prev[id] })),
    [],
  );

  const sviConfig = maps.find((c) => c.id === resolvedSviMapId);
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
      <MapTabSelector maps={visibleMaps} selectedMapId={resolvedSviMapId} onChange={setSviMapId} />
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
                        updateMap(resolvedSviMapId, {
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
              onChange={(next) => updateMap(resolvedSviMapId, next)}
            />
          )}
        </Stack>
      )}
    </MenuShell>
  );
};
