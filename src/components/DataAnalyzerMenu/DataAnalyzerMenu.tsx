import { Fragment } from "react";
import { Stack, Divider, Typography } from "@mui/material";
import { useMapStore, useFilterStore } from "../../stores";
import { useMetricValues } from "../../api/queries/metricValues";
import { HistogramSection } from "./components/HistogramSection";
import { LayerMenuSection } from "./components/LayerMenuSection";
import { MapDerivedFilterSection } from "./components/MapDerivedFilterSection";
import { useVisibleMenuTrees } from "../../hooks/useVisibleMenuTrees";

export const DataAnalyzerMenu = () => {
  const mapConfigs = useMapStore((state) => state.mapConfigs);
  const primaryMapId = useMapStore((state) => state.primaryMapId);
  const menuTrees = useVisibleMenuTrees(primaryMapId);

  const primaryConfig = mapConfigs.find((c) => c.id === primaryMapId);
  const dataset = primaryConfig?.dataset;
  const metric = primaryConfig?.metric;
  const dataset2 = primaryConfig?.dataset2 ?? dataset;
  const metric2 = primaryConfig?.metric2;
  const activeGeoid = primaryConfig?.activeFeature?.geoid ?? null;
  const cachedValues = useMetricValues(dataset, metric);

  return (
    <Stack spacing={2}>
      <HistogramSection
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
        dataset={dataset}
        metric={metric}
        dataset2={dataset2}
        metric2={metric2}
        onClearAll={() => useFilterStore.getState().clear()}
      />
    </Stack>
  );
};
