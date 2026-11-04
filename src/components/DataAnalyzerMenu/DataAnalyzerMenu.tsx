import { Fragment, useState } from "react";
import { Stack, Divider, Typography } from "@mui/material";
import { useAppStore, useMapStore, useFilterStore } from "../../stores";
import { HistogramSection } from "./components/HistogramSection";
import { LayerMenuSection } from "./components/LayerMenuSection";
import { MapDerivedFilterSection } from "./components/MapDerivedFilterSection";
import { useVisibleMenuTrees } from "../../hooks/useVisibleMenuTrees";

export const DataAnalyzerMenu = () => {
  const mapConfigs = useMapStore((state) => state.mapConfigs);
  const primaryMapId = useMapStore((state) => state.primaryMapId);
  const metricValuesCache = useAppStore((state) => state.metricValuesCache);
  const menuTrees = useVisibleMenuTrees(primaryMapId);

  const primaryConfig = mapConfigs.find((c) => c.id === primaryMapId);
  const dataset = primaryConfig?.dataset;
  const metric = primaryConfig?.metric;
  const dataset2 = primaryConfig?.dataset2 ?? dataset;
  const metric2 = primaryConfig?.metric2;
  const activeGeoid = primaryConfig?.activeFeature?.geoid ?? null;
  const cacheKey = dataset && metric ? `${dataset}::${metric}` : null;
  const cachedValues = cacheKey ? metricValuesCache[cacheKey] : null;

  const [resetKey, setResetKey] = useState(0);

  const handleClearAll = () => {
    useFilterStore.getState().clearFilter();
    setResetKey((k) => k + 1);
  };

  return (
    <Stack spacing={2}>
      <HistogramSection
        key={`histogram-${resetKey}`}
        metric={metric}
        cachedValues={cachedValues}
        activeGeoid={activeGeoid}
        dataset={dataset}
        dataset2={dataset2}
        metric2={metric2}
      />

      {menuTrees
        .filter(({ nodes }) => nodes.length > 0)
        .map(({ menu, nodes }) => (
          <Fragment key={menu.id}>
            <Divider />
            <LayerMenuSection title={menu.title} nodes={nodes} />
          </Fragment>
        ))}

      <Divider />
      <Typography variant="caption" color="text.secondary">
        Overlap filtering derived from what's currently visible on the map
      </Typography>

      <MapDerivedFilterSection
        key={`filter-${resetKey}`}
        dataset={dataset}
        metric={metric}
        dataset2={dataset2}
        metric2={metric2}
        onClearAll={handleClearAll}
      />
    </Stack>
  );
};
