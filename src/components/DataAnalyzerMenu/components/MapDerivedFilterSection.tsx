import { useMemo } from "react";
import { Stack, Button, IconButton, CircularProgress, Tooltip } from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { useAppStore, useFilterStore, useMapStore } from "../../../stores";
import { applyFilter, useAreaFilter } from "../../../api/queries/filter";
import { useVisibleMenuTrees } from "../../../hooks/useVisibleMenuTrees";
import { flattenVisibleLayers } from "../../../utils/layerMenus";
import { useDatasets } from "../../../api/queries/datasets";
import { layerMetricKey, useMetric, useMetrics } from "../../../api/queries/metrics";
import type { ValueRange } from "../../../types";

interface MapDerivedFilterSectionProps {
  // The main map's indicator key and its comparison indicator's key; each is also its filter column
  metric: string | undefined;
  metric2: string | undefined;
  onClearAll: () => void;
}

export const MapDerivedFilterSection: React.FC<MapDerivedFilterSectionProps> = ({
  metric,
  metric2,
  onClearAll,
}) => {
  const primaryMapId = useMapStore((state) => state.primaryMapId);
  const menuTrees = useVisibleMenuTrees(primaryMapId);
  const metrics = useMetrics();
  const datasets = useDatasets();
  const primary = useMetric(metric);
  const filterRange = useFilterStore((state) => state.ranges.primary);
  const filterRange2 = useFilterStore((state) => state.ranges.comparison);
  const exportTable = useAppStore((state) => state.exportTable);

  const isLoading = useAreaFilter().isFetching;

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

  // With no SVI on the map, neighborhoods aren't part of the analysis:
  // Filter just keeps the checked layers' points that sit inside a visible hazard or raster area.
  const sviShown = Boolean(metric);

  // The "Filter range" and "Comparison Metric Filter Range" sliders, when moved
  const hasMetricThreshold = sviShown && filterRange !== null;
  const hasMetricThreshold2 = Boolean(metric2) && filterRange2 !== null;
  const hasCriteria = sviShown
    ? hazardIds.length > 0 || hasMetricThreshold || hasMetricThreshold2 || pointLayerIds.length > 0
    : (hazardIds.length > 0 || rasterIds.length > 0) && pointLayerIds.length > 0;

  const handleApply = () => {
    if (!sviShown) {
      applyFilter({
        kind: "points",
        hazards: hazardIds,
        rasters: rasterIds,
        pointLayers: pointLayerIds,
      });
      return;
    }

    const homelands = primary?.dataset.hawaiian_homelands ?? false;
    const ranges: Record<string, ValueRange> = {};
    if (hasMetricThreshold) ranges[metric!] = { min: filterRange![0], max: filterRange![1] };
    if (hasMetricThreshold2) ranges[metric2!] = { min: filterRange2![0], max: filterRange2![1] };

    // At least one point of each visible point layer, on its count's filter column
    for (const id of pointLayerIds) {
      ranges[layerMetricKey(metrics, datasets, id, homelands, "Count")!] = { min: 1 };
    }

    applyFilter({ kind: "areas", homelands, hazards: hazardIds, rasters: rasterIds, ranges });
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
        <IconButton size="small" disabled={!exportTable} onClick={() => exportTable!()}>
          <DownloadIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Stack>
  );
};
