import { useMemo, useState } from "react";
import { Stack, Divider, Typography } from "@mui/material";
import { useAppStore, useMapStore, useFilterStore, useHazardLayersStore } from "../../stores";
import { HistogramSection } from "./components/HistogramSection";
import { HazardSection } from "./components/HazardSection";
import { MapDerivedFilterSection } from "./components/MapDerivedFilterSection";
import { deriveVisibleHazards } from "./deriveHazard";

export const DataAnalyzerMenu = () => {
  const mapConfigs = useMapStore((state) => state.mapConfigs);
  const primaryMapId = useMapStore((state) => state.primaryMapId);
  const metricValuesCache = useAppStore((state) => state.metricValuesCache);
  const visibleLayerIdsByMap = useHazardLayersStore((state) => state.visibleLayerIdsByMap);

  const hasHazard = useMemo(
    () => deriveVisibleHazards(visibleLayerIdsByMap[primaryMapId]).length > 0,
    [visibleLayerIdsByMap, primaryMapId],
  );

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
        key={resetKey}
        metric={metric}
        cachedValues={cachedValues}
        activeGeoid={activeGeoid}
        dataset={dataset}
        dataset2={dataset2}
        metric2={metric2}
      />

      {hasHazard && (
        <>
          <Divider />
          <HazardSection />
        </>
      )}

      <Divider />
      <Typography variant="caption" color="text.secondary">
        Overlap filtering derived from what's currently visible on the map
      </Typography>

      <MapDerivedFilterSection
        key={resetKey}
        dataset={dataset}
        metric={metric}
        dataset2={dataset2}
        metric2={metric2}
        onClearAll={handleClearAll}
      />
    </Stack>
  );
};
