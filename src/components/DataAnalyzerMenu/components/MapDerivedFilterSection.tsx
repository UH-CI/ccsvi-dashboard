import { useMemo } from "react";
import { Stack, Typography, Chip, Button, IconButton, CircularProgress } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { useAppStore, useFilterStore, useMapStore, useHazardLayersStore } from "../../../stores";
import { deriveHazard } from "../deriveHazard";

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
  const datasetCatalog = useAppStore((state) => state.datasetCatalog);
  const filterRange = useAppStore((state) => state.filterRange);
  const filterRange2 = useAppStore((state) => state.filterRange2);

  const setHazard = useFilterStore((state) => state.setHazard);
  const setMetricFilter = useFilterStore((state) => state.setMetricFilter);
  const metricFilters = useFilterStore((state) => state.metricFilters);
  const applyFilter = useFilterStore((state) => state.applyFilter);
  const buildExportUrl = useFilterStore((state) => state.buildExportUrl);
  const isLoading = useFilterStore((state) => state.isLoading);
  const error = useFilterStore((state) => state.error);
  const results = useFilterStore((state) => state.results);

  const derivedHazard = useMemo(
    () => deriveHazard(visibleLayerIdsByMap[primaryMapId]),
    [visibleLayerIdsByMap, primaryMapId],
  );

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

  const hasMetricThreshold = mvColumn !== null && filterRange !== null;
  const hasMetricThreshold2 = mvColumn2 !== null && filterRange2 !== null;
  const hasCriteria = derivedHazard !== null || hasMetricThreshold || hasMetricThreshold2;

  const handleApply = () => {
    setHazard(derivedHazard?.hazardId ?? null, derivedHazard?.subId ?? null);
    for (const col of Object.keys(metricFilters)) setMetricFilter(col, null);
    if (hasMetricThreshold && mvColumn) setMetricFilter(mvColumn, filterRange![0]);
    if (hasMetricThreshold2 && mvColumn2) setMetricFilter(mvColumn2, filterRange2![0]);
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
          disabled={!hasCriteria}
          component="a"
          href={hasCriteria ? buildExportUrl() : undefined}
          download
        >
          <DownloadIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Stack>
  );
};
