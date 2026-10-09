import { useMemo } from "react";
import { Stack, Typography, Chip, Button, IconButton, CircularProgress } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import {
  useAppStore,
  useFilterStore,
  useMapStore,
  useHazardLayersStore,
  usePointLayerStore,
} from "../../../stores";
import { deriveVisibleHazards } from "../deriveHazard";
import {
  deriveVisibleCriticalInfrastructure,
  deriveVisibleLocationsOfEnhancedExposure,
} from "../derivePoints";

interface MapDerivedFilterSectionProps {
  dataset: string | undefined;
  metric: string | undefined;
  dataset2: string | undefined;
  metric2: string | undefined;
  onClearAll: () => void;
}

export const MapDerivedFilterSection: React.FC<MapDerivedFilterSectionProps> = ({
  dataset,
  metric,
  dataset2,
  metric2,
  onClearAll,
}) => {
  const primaryMapId = useMapStore((state) => state.primaryMapId);
  const visibleLayerIdsByMap = useHazardLayersStore((state) => state.visibleLayerIdsByMap);
  const visiblePointLayerIdsByMap = usePointLayerStore((state) => state.visibleLayerIdsByMap);
  const datasetCatalog = useAppStore((state) => state.datasetCatalog);
  const filterRange = useAppStore((state) => state.filterRange);
  const filterRange2 = useAppStore((state) => state.filterRange2);

  const setHazards = useFilterStore((state) => state.setHazards);
  const setHomelands = useFilterStore((state) => state.setHomelands);
  const setMetricFilter = useFilterStore((state) => state.setMetricFilter);
  const metricFilters = useFilterStore((state) => state.metricFilters);
  const pointLayerFilters = useFilterStore((state) => state.pointLayerFilters);
  const pointGroupModes = useFilterStore((state) => state.pointGroupModes);
  const setAnyFilters = useFilterStore((state) => state.setAnyFilters);
  const applyFilter = useFilterStore((state) => state.applyFilter);
  const applyPointHazardFilter = useFilterStore((state) => state.applyPointHazardFilter);
  const buildExportUrl = useFilterStore((state) => state.buildExportUrl);
  const isLoading = useFilterStore((state) => state.isLoading);
  const error = useFilterStore((state) => state.error);
  const results = useFilterStore((state) => state.results);

  const derivedHazards = useMemo(
    () => deriveVisibleHazards(visibleLayerIdsByMap[primaryMapId]),
    [visibleLayerIdsByMap, primaryMapId],
  );

  // Checked layers that are still visible on the map, kept separate per section so
  // each section's own All/Any switch can be read when Apply runs.
  const checkedVisibleBySection = useMemo(() => {
    const visiblePoints = visiblePointLayerIdsByMap[primaryMapId];
    return {
      criticalInfrastructure: deriveVisibleCriticalInfrastructure(visiblePoints).filter((layer) =>
        pointLayerFilters.has(layer.id),
      ),
      locationsOfEnhancedExposure: deriveVisibleLocationsOfEnhancedExposure(visiblePoints).filter(
        (layer) => pointLayerFilters.has(layer.id),
      ),
    };
  }, [visiblePointLayerIdsByMap, primaryMapId, pointLayerFilters]);

  const checkedVisiblePointLayers = [
    ...checkedVisibleBySection.criticalInfrastructure,
    ...checkedVisibleBySection.locationsOfEnhancedExposure,
  ];

  // Primary metric threshold, from the Explore section's "Filter range" slider
  const mvColumn =
    dataset && metric && datasetCatalog
      ? (datasetCatalog[dataset]?.columnThresholds[metric]?.mvColumn ?? null)
      : null;

  // Comparison metric threshold, from the Explore section's "Comparison Metric Filter Range" slider
  const mvColumn2 =
    dataset2 && metric2 && datasetCatalog
      ? (datasetCatalog[dataset2]?.columnThresholds[metric2]?.mvColumn ?? null)
      : null;

  // With no SVI on the map, neighborhoods aren't part of the analysis:
  // Filter just keeps the checked layers' points that sit inside a visible hazard.
  const sviShown = Boolean(dataset && metric);

  const hasMetricThreshold = mvColumn !== null && filterRange !== null;
  const hasMetricThreshold2 = mvColumn2 !== null && filterRange2 !== null;
  const hasCriteria = sviShown
    ? derivedHazards.length > 0 ||
      hasMetricThreshold ||
      hasMetricThreshold2 ||
      checkedVisiblePointLayers.length > 0
    : derivedHazards.length > 0 && checkedVisiblePointLayers.length > 0;

  const handleApply = () => {
    const hazardIds = derivedHazards.map((h) => (h.subId ? `${h.hazardId}.${h.subId}` : h.hazardId));
    if (!sviShown) {
      applyPointHazardFilter(hazardIds, new Set(checkedVisiblePointLayers.map((layer) => layer.id)));
      return;
    }

    setHomelands(
      dataset && datasetCatalog ? (datasetCatalog[dataset]?.hawaiianHomelands ?? false) : false,
    );
    setHazards(hazardIds);
    for (const col of Object.keys(metricFilters)) setMetricFilter(col, null);
    if (hasMetricThreshold && mvColumn) setMetricFilter(mvColumn, filterRange![0]);
    if (hasMetricThreshold2 && mvColumn2) setMetricFilter(mvColumn2, filterRange2![0]);

    const anyEntries: string[] = [];
    for (const [groupId, layers] of Object.entries(checkedVisibleBySection)) {
      const mode = pointGroupModes[groupId] ?? "all";
      for (const layer of layers) {
        if (mode === "all") {
          setMetricFilter(`${layer.id}_count_abs`, 1);
        } else {
          anyEntries.push(`${groupId}:${layer.id}_count_abs:1`);
        }
      }
    }
    setAnyFilters(anyEntries);

    applyFilter();
  };

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Button
          variant="contained"
          size="small"
          onClick={handleApply}
          disabled={!hasCriteria || isLoading}
          startIcon={isLoading ? <CircularProgress size={14} color="inherit" /> : undefined}
        >
          Filter
        </Button>
        <Button size="small" onClick={onClearAll}>
          Clear
        </Button>
        <IconButton
          size="small"
          disabled={!hasCriteria || !sviShown}
          component="a"
          href={hasCriteria && sviShown ? buildExportUrl() : undefined}
          download
        >
          <DownloadIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Stack>
  );
};
