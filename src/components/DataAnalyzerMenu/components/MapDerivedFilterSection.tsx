import { useMemo } from "react";
import { Stack, Typography, Chip, Button, IconButton, CircularProgress } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { useAppStore, useFilterStore, useMapStore, useHazardLayersStore } from "../../../stores";
import { deriveHazard } from "../deriveHazard";

interface MapDerivedFilterSectionProps {
  dataset: string | undefined;
  metric: string | undefined;
  onClearAll: () => void;
}

export const MapDerivedFilterSection: React.FC<MapDerivedFilterSectionProps> = ({
  dataset,
  metric,
  onClearAll,
}) => {
  const primaryMapId = useMapStore((state) => state.primaryMapId);
  const visibleLayerIdsByMap = useHazardLayersStore((state) => state.visibleLayerIdsByMap);
  const datasetCatalog = useAppStore((state) => state.datasetCatalog);
  const filterRange = useAppStore((state) => state.filterRange);

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

  const mvColumn =
    dataset && metric && datasetCatalog
      ? (datasetCatalog[dataset]?.columnThresholds[metric]?.mvColumn ?? null)
      : null;

  const hasMetricThreshold = mvColumn !== null && filterRange !== null;
  const hasCriteria = derivedHazard !== null || hasMetricThreshold;

  const handleApply = () => {
    setHazard(derivedHazard?.hazardId ?? null, derivedHazard?.subId ?? null);
    for (const col of Object.keys(metricFilters)) setMetricFilter(col, null);
    if (hasMetricThreshold && mvColumn) setMetricFilter(mvColumn, filterRange![0]);
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
