import { Fragment } from "react";
import { Stack, Divider, Typography } from "@mui/material";
import { useMapStore, useFilterStore } from "../../stores";
import { useMetricValues } from "../../api/queries/metricValues";
import { HistogramSection } from "./components/HistogramSection";
import { LayerMenuSection } from "./components/LayerMenuSection";
import { MapDerivedFilterSection } from "./components/MapDerivedFilterSection";
import { useVisibleMenuTrees } from "../../hooks/useVisibleMenuTrees";

export const DataAnalyzerMenu = () => {
  const maps = useMapStore((state) => state.maps);
  const primaryMapId = useMapStore((state) => state.primaryMapId);
  const menuTrees = useVisibleMenuTrees(primaryMapId);

  const primaryConfig = maps.find((c) => c.id === primaryMapId);
  const metric = primaryConfig?.metric || undefined;
  const metric2 = primaryConfig?.metric2;
  const activeGeoid = primaryConfig?.activeFeature?.geoid ?? null;
  const cachedValues = useMetricValues(metric);

  return (
    <Stack spacing={2}>
      <HistogramSection
        metric={metric}
        cachedValues={cachedValues}
        activeGeoid={activeGeoid}
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
        metric={metric}
        metric2={metric2}
        onClearAll={() => useFilterStore.getState().clear()}
      />
    </Stack>
  );
};
