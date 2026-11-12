import { useMemo } from "react";
import { Box, Typography, Stack, Divider } from "@mui/material";
import { useFilterStore } from "../../../stores/useFilterStore";
import { useFilteredGeoids } from "../../../api/queries/filter";
import { metricNumber, useMetricValues } from "../../../api/queries/metricValues";
import { useMetric } from "../../../api/queries/metrics";
import { sviCalculationDescription, sviLabel } from "../../../config/sviCategories";
import { MetricValue } from "../../../types";
import { binIndex, binValues, matchingValues, metricNumbers, valueBounds } from "./analyzerStats";
import { ComparisonSection } from "./ComparisonSection";
import { DistributionChart } from "./DistributionChart";
import { MatchSummary } from "./MatchSummary";
import { RangeSlider } from "./RangeSlider";

interface HistogramSectionProps {
  // The main map's indicator key and its comparison indicator's key
  metric: string | undefined;
  cachedValues: Record<string, MetricValue> | null | undefined;
  activeGeoid: string | null;
  metric2: string | undefined;
}

export const HistogramSection: React.FC<HistogramSectionProps> = ({
  metric,
  cachedValues,
  activeGeoid,
  metric2,
}) => {
  const setRange = useFilterStore((state) => state.setRange);
  const { primary: filterRange, comparison: filterRange2 } = useFilterStore(
    (state) => state.ranges,
  );
  const cachedValues2 = useMetricValues(metric2);
  const kind = useMetric(metric)?.kind;
  const kind2 = useMetric(metric2)?.kind;

  const filteredGeoids = useFilteredGeoids();

  const allValues = useMemo(() => metricNumbers(cachedValues, kind), [cachedValues, kind]);
  const bounds = useMemo(() => valueBounds(allValues), [allValues]);
  const bounds2 = useMemo(
    () => valueBounds(metricNumbers(cachedValues2, kind2)),
    [cachedValues2, kind2],
  );
  // The areas the Filter keeps that pass both sliders
  const matchedValues = useMemo(
    () =>
      matchingValues(
        cachedValues,
        kind,
        cachedValues2,
        kind2,
        filteredGeoids,
        filterRange,
        filterRange2,
      ),
    [cachedValues, kind, cachedValues2, kind2, filteredGeoids, filterRange, filterRange2],
  );
  const bins = useMemo(
    () => (kind ? binValues(allValues, matchedValues, bounds, kind) : []),
    [allValues, matchedValues, bounds, kind],
  );

  const activeValue =
    activeGeoid && cachedValues && kind ? metricNumber(cachedValues[activeGeoid], kind) : null;
  const activeBinLabel =
    activeValue === null || bins.length === 0 ? null : bins[binIndex(activeValue, bounds)].label;

  if (!metric) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
        Select a Social Vulnerability Indicator on the map to analyze its distribution.
      </Typography>
    );
  }

  if (!kind || allValues.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
        Loading data…
      </Typography>
    );
  }

  const metricTitle = metric2 ? `${sviLabel(metric)} vs ${sviLabel(metric2)}` : sviLabel(metric);
  const metricDescription = sviCalculationDescription(metric);

  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="sectionHeading">Selected Social Vulnerability Indicator</Typography>
        <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.25 }} noWrap title={metricTitle}>
          {metricTitle}
        </Typography>
        {metricDescription && (
          <Typography variant="caption" color="text.secondary" display="block">
            {metricDescription}
          </Typography>
        )}
      </Box>

      <Divider />

      <DistributionChart bins={bins} activeBinLabel={activeBinLabel} />

      <MatchSummary
        kind={kind}
        activeValue={activeValue}
        allValues={allValues}
        matchedValues={matchedValues}
      />

      <RangeSlider
        title="Filter range"
        info={{
          tooltip:
            "Limits the primary vulnerability indicator to the selected minimum and maximum values. The range is used when filters are applied and is reflected in the histogram and count.",
          label: "About indicator value range",
        }}
        bounds={bounds}
        value={filterRange}
        kind={kind}
        onChange={(range) => setRange("primary", range)}
      />

      {metric2 && cachedValues2 && kind2 && (
        <RangeSlider
          title="Comparison Metric Filter Range"
          bounds={bounds2}
          value={filterRange2}
          kind={kind2}
          onChange={(range) => setRange("comparison", range)}
        />
      )}

      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="body2" color="text.secondary">
          {filteredGeoids ? "Block groups matching filter" : "Block groups in range"}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {matchedValues.length} / {allValues.length}
        </Typography>
      </Box>

      <Divider />
      <ComparisonSection metric={metric} metric2={metric2} activeGeoid={activeGeoid} />
    </Stack>
  );
};
