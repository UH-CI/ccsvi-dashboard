import React, { useCallback, useState } from "react";
import { Stack } from "@mui/material";
import { useMapStore, useVisibleMaps } from "../../../stores/useMapStore";
import { SVI_CATEGORIES } from "../../../config/sviCategories";
import { MenuShell, type MenuProps } from "./MenuShell";
import { MapTabSelector } from "./MapTabSelector";
import { useMenuMap } from "../useMenuMap";
import { LayerToggleGroup } from "./LayerToggleGroup";
import { LayerToggleItem } from "./LayerToggleItem";
import { ComparisonMetricSelect } from "./ComparisonMetricSelect";

export const SviMenu: React.FC<MenuProps> = (props) => {
  const maps = useMapStore((s) => s.maps);
  const updateMap = useMapStore((s) => s.updateMap);

  const visibleMaps = useVisibleMaps();
  const [resolvedSviMapId, setSviMapId] = useMenuMap(visibleMaps);

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
    <MenuShell {...props}>
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
