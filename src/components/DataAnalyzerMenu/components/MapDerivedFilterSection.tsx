import { useMemo } from "react";
import { Stack, Button, IconButton, CircularProgress, Tooltip } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { useAppStore, useFilterStore, useMapStore } from "../../../stores";
import { useVisibleMenuTrees } from "../../../hooks/useVisibleMenuTrees";
import { flattenVisibleLayers } from "../../../utils/layerMenus";

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
  const menuTrees = useVisibleMenuTrees(primaryMapId);
  const datasetCatalog = useAppStore((state) => state.datasetCatalog);
  const filterRange = useAppStore((state) => state.filterRange);
  const filterRange2 = useAppStore((state) => state.filterRange2);

  const setHazards = useFilterStore((state) => state.setHazards);
  const setRasters = useFilterStore((state) => state.setRasters);
  const setHomelands = useFilterStore((state) => state.setHomelands);
  const setMetricFilter = useFilterStore((state) => state.setMetricFilter);
  const metricFilters = useFilterStore((state) => state.metricFilters);
  const applyFilter = useFilterStore((state) => state.applyFilter);
  const applyPointHazardFilter = useFilterStore((state) => state.applyPointHazardFilter);
  const buildExportUrl = useFilterStore((state) => state.buildExportUrl);
  const isLoading = useFilterStore((state) => state.isLoading);

  // Every visible shape must overlap, every visible raster is checked, and every visible
  // point layer must have at least one point in the area, whichever menu each is in
  const { hazardIds, rasterIds, pointLayerIds } = useMemo(() => {
    const visible = menuTrees.flatMap(({ nodes }) => flattenVisibleLayers(nodes));
    const keysOf = (kind: string) => visible.filter((l) => l.kind === kind).map((l) => l.key);
    return {
      hazardIds: keysOf("shape"),
      rasterIds: keysOf("raster"),
      pointLayerIds: keysOf("point"),
    };
  }, [menuTrees]);

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
  // Filter just keeps the checked layers' points that sit inside a visible hazard or raster area.
  const sviShown = Boolean(dataset && metric);

  const hasMetricThreshold = mvColumn !== null && filterRange !== null;
  const hasMetricThreshold2 = mvColumn2 !== null && filterRange2 !== null;
  const hasCriteria = sviShown
    ? hazardIds.length > 0 || hasMetricThreshold || hasMetricThreshold2 || pointLayerIds.length > 0
    : (hazardIds.length > 0 || rasterIds.length > 0) && pointLayerIds.length > 0;

  const handleApply = () => {
    if (!sviShown) {
      applyPointHazardFilter(hazardIds, rasterIds, new Set(pointLayerIds));
      return;
    }

    setHomelands(
      dataset && datasetCatalog ? (datasetCatalog[dataset]?.hawaiianHomelands ?? false) : false,
    );
    setHazards(hazardIds);
    setRasters(rasterIds);
    for (const col of Object.keys(metricFilters)) setMetricFilter(col, null);
    if (hasMetricThreshold && mvColumn) setMetricFilter(mvColumn, filterRange![0]);
    if (hasMetricThreshold2 && mvColumn2) setMetricFilter(mvColumn2, filterRange2![0]);

    for (const id of pointLayerIds) setMetricFilter(`${id}_count_abs`, 1);

    applyFilter();
  };

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Tooltip
          title="Limits the map to areas within the selected range of the chosen vulnerability indicator."
          enterTouchDelay={0}
          leaveTouchDelay={5000}
        >
          <span>
            <Button
              variant="contained"
              size="small"
              onClick={handleApply}
              disabled={!hasCriteria || isLoading}
              startIcon={isLoading ? <CircularProgress size={14} color="inherit" /> : undefined}
            >
              Filter
            </Button>
          </span>
        </Tooltip>
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
