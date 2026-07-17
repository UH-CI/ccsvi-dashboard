import { useState } from "react";
import { Stack, Divider, Typography } from "@mui/material";
import { useAppStore, useMapStore, useFilterStore } from "../../stores";
import { HistogramSection } from "./components/HistogramSection";
import { HazardSection } from "./components/HazardSection";
import { MapDerivedFilterSection } from "./components/MapDerivedFilterSection";

export const DataAnalyzerMenu = () => {
  const mapConfigs = useMapStore((state) => state.mapConfigs);
  const primaryMapId = useMapStore((state) => state.primaryMapId);
  const metricValuesCache = useAppStore((state) => state.metricValuesCache);

  const primaryConfig = mapConfigs.find((c) => c.id === primaryMapId);
  const dataset = primaryConfig?.dataset;
  const metric = primaryConfig?.metric;
  const activeGeoid = primaryConfig?.activeFeature?.geoid ?? null;
  const cacheKey = dataset && metric ? `${dataset}::${metric}` : null;
  const cachedValues = cacheKey ? metricValuesCache[cacheKey] : null;

  // remounts HistogramSection
  const [resetKey, setResetKey] = useState(0);

  const handleClearAll = () => {
    useFilterStore.getState().clearFilter();
    setResetKey((k) => k + 1);
  };

  return (
    <Stack spacing={2}>
      <HistogramSection
        key={resetKey}
        metric={metric}
        cachedValues={cachedValues}
        activeGeoid={activeGeoid}
      />

      <Divider />
      <HazardSection />

      <Divider />
      <Typography variant="caption" color="text.secondary">
        Overlap filtering derived from what's currently visible on the map
      </Typography>

      <MapDerivedFilterSection dataset={dataset} metric={metric} onClearAll={handleClearAll} />
    </Stack>
  );
};
