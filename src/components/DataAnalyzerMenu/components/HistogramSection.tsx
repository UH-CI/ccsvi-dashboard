import { useMemo, useState, useEffect } from "react";
import { Box, Slider, Typography, Stack, Divider } from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useAppStore, useFilteredGeoids } from "../../../stores";
import { sviCalculationDescription, sviLabel } from "../../../config";
import { MetricValue } from "../../../types";
import { pickValue, formatValue } from "../metricValueHelpers";
import { ComparisonSection } from "./ComparisonSection";

const NUM_BINS = 20;

function meanMedian(values: number[]): { mean: number; median: number } | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  return { mean, median };
}

interface HistogramSectionProps {
  metric: string | undefined;
  cachedValues: Record<string, MetricValue> | null | undefined;
  activeGeoid: string | null;
  dataset: string | undefined;
  dataset2: string | undefined;
  metric2: string | undefined;
}

export const HistogramSection: React.FC<HistogramSectionProps> = ({
  metric,
  cachedValues,
  activeGeoid,
  dataset,
  dataset2,
  metric2,
}) => {
  const setFilterRange = useAppStore((state) => state.setFilterRange);
  const setFilterRange2 = useAppStore((state) => state.setFilterRange2);
  const metricValuesCache = useAppStore((state) => state.metricValuesCache);

  const cacheKey2 = dataset2 && metric2 ? `${dataset2}::${metric2}` : null;
  const cachedValues2 = cacheKey2 ? metricValuesCache[cacheKey2] : null;

  const { isPercentage2, dataMin2, dataMax2 } = useMemo(() => {
    if (!cachedValues2) return { isPercentage2: false, dataMin2: 0, dataMax2: 1 };
    const entries = Object.values(cachedValues2);
    const isPercentage2 = entries.some((e) => e.percentage != null);
    const vals = entries.map(pickValue).filter((v): v is number => v !== null);
    if (vals.length === 0) return { isPercentage2, dataMin2: 0, dataMax2: 1 };
    return { isPercentage2, dataMin2: Math.min(...vals), dataMax2: Math.max(...vals) };
  }, [cachedValues2]);

  const [range2, setRange2] = useState<[number, number]>([0, 1]);

  useEffect(() => {
    setRange2([dataMin2, dataMax2]);
    setFilterRange2(null);
  }, [dataMin2, dataMax2, setFilterRange2]);

  const { allValues, isPercentage } = useMemo(() => {
    if (!cachedValues) return { allValues: [], isPercentage: false };
    const entries = Object.values(cachedValues);
    const usePct = entries.some((e) => e.percentage != null);
    const vals = entries.map(pickValue).filter((v): v is number => v !== null);
    return { allValues: vals, isPercentage: usePct };
  }, [cachedValues]);

  // Values of the areas the map currently shows as matching
  const filteredGeoids = useFilteredGeoids();
  const filterRange = useAppStore((state) => state.filterRange);
  const matchedValues = useMemo(() => {
    if (!cachedValues) return [];
    return Object.entries(cachedValues)
      .filter(([geoid]) => !filteredGeoids || filteredGeoids.has(geoid))
      .map(([, entry]) => pickValue(entry))
      .filter(
        (v): v is number =>
          v !== null && (!filterRange || (v >= filterRange[0] && v <= filterRange[1])),
      );
  }, [filteredGeoids, filterRange, cachedValues]);

  const { bins, dataMin, dataMax } = useMemo(() => {
    if (allValues.length === 0) return { bins: [], dataMin: 0, dataMax: 1 };
    const dataMin = Math.min(...allValues);
    const dataMax = Math.max(...allValues);
    const step = (dataMax - dataMin) / NUM_BINS || 1;
    const bins = Array.from({ length: NUM_BINS }, (_, i) => ({
      label: formatValue(dataMin + i * step, isPercentage, dataMax),
      start: dataMin + i * step,
      end: dataMin + (i + 1) * step,
      count: 0,
      matched: 0,
      rest: 0,
    }));
    const binIndex = (v: number) => Math.min(Math.floor((v - dataMin) / step), NUM_BINS - 1);
    for (const v of allValues) bins[binIndex(v)].count++;
    for (const v of matchedValues ?? []) bins[binIndex(v)].matched++;
    for (const bin of bins) bin.rest = bin.count - bin.matched;
    return { bins, dataMin, dataMax };
  }, [allValues, matchedValues, isPercentage]);

  const activeValue = useMemo(
    () => (activeGeoid && cachedValues ? pickValue(cachedValues[activeGeoid]) : null),
    [activeGeoid, cachedValues],
  );

  const activeBinLabel = useMemo(() => {
    if (activeValue == null || bins.length === 0) return null;
    const step = (dataMax - dataMin) / NUM_BINS || 1;
    const idx = Math.min(Math.floor((activeValue - dataMin) / step), NUM_BINS - 1);
    return bins[idx]?.label ?? null;
  }, [activeValue, bins, dataMin, dataMax]);

  const stats = useMemo(() => meanMedian(allValues), [allValues]);
  const matchedStats = useMemo(() => meanMedian(matchedValues), [matchedValues]);

  const [range, setRange] = useState<[number, number]>([0, 1]);

  useEffect(() => {
    setRange([dataMin, dataMax]);
    setFilterRange(null);
  }, [dataMin, dataMax, setFilterRange]);

  if (!metric) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
        Select a Social Vulnerability Indicator on the map to analyze its distribution.
      </Typography>
    );
  }

  if (allValues.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
        Loading data…
      </Typography>
    );
  }

  const metricTitle = metric2
    ? `${sviLabel(dataset, metric)} vs ${sviLabel(dataset2, metric2)}`
    : sviLabel(dataset, metric);
  const metricDescription = sviCalculationDescription(dataset, metric);

  return (
    <Stack spacing={2}>
      <Box>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}
        >
          Metric
        </Typography>
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

      <Box>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}
        >
          Distribution
        </Typography>
        <ResponsiveContainer width="100%" height={100}>
          <BarChart
            data={bins}
            margin={{ top: 8, right: 0, bottom: 0, left: 0 }}
            barCategoryGap={2}
          >
            <XAxis dataKey="label" hide />
            <YAxis hide />
            <RechartsTooltip
              cursor={{ fill: "rgba(0,0,0,0.05)" }}
              formatter={(v, name) => [v != null ? `${v} block groups` : "–", name]}
              labelFormatter={(label) => (label != null ? String(label) : "")}
              contentStyle={{ fontSize: "0.75rem", borderRadius: 8 }}
            />
            <Bar dataKey="matched" name="Matching" stackId="bin" fill="#1976d2" />
            <Bar
              dataKey="rest"
              name="Not matching"
              stackId="bin"
              fill="#d0d0d0"
              radius={[2, 2, 0, 0]}
            />
            {activeBinLabel && (
              <ReferenceLine
                x={activeBinLabel}
                stroke="#e53935"
                strokeWidth={2}
                strokeDasharray="4 2"
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </Box>

      {stats && (
        <Box display="flex" justifyContent="space-around">
          {activeValue != null && (
            <Box textAlign="center">
              <Typography variant="caption" color="text.secondary" display="block">
                Selected area
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "#e53935" }}>
                {formatValue(activeValue, isPercentage, dataMax)}
              </Typography>
            </Box>
          )}
          <Box textAlign="center">
            <Typography variant="caption" color="text.secondary" display="block">
              Mean
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {matchedStats ? formatValue(matchedStats.mean, isPercentage, dataMax) : "–"}
            </Typography>
            {matchedValues.length !== allValues.length && (
              <Typography variant="caption" color="text.secondary" display="block">
                all {formatValue(stats.mean, isPercentage, dataMax)}
              </Typography>
            )}
          </Box>
          <Box textAlign="center">
            <Typography variant="caption" color="text.secondary" display="block">
              Median
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {matchedStats ? formatValue(matchedStats.median, isPercentage, dataMax) : "–"}
            </Typography>
            {matchedValues.length !== allValues.length && (
              <Typography variant="caption" color="text.secondary" display="block">
                all {formatValue(stats.median, isPercentage, dataMax)}
              </Typography>
            )}
          </Box>
        </Box>
      )}

      <Box>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}
        >
          Filter range
        </Typography>
        <Box sx={{ px: 1, mt: 1 }}>
          <Slider
            value={range}
            min={dataMin}
            max={dataMax}
            step={(dataMax - dataMin) / 100}
            onChange={(_, v) => {
              const r = v as [number, number];
              setRange(r);
              setFilterRange(r);
            }}
            valueLabelDisplay="auto"
            valueLabelFormat={(v) => formatValue(v, isPercentage, dataMax)}
            size="small"
          />
        </Box>
        <Box display="flex" justifyContent="space-between">
          <Typography variant="caption" color="text.secondary">
            {formatValue(dataMin, isPercentage, dataMax)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatValue(dataMax, isPercentage, dataMax)}
          </Typography>
        </Box>
      </Box>

      {metric2 && cachedValues2 && (
        <Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}
          >
            Comparison Metric Filter Range
          </Typography>
          <Box sx={{ px: 1, mt: 1 }}>
            <Slider
              value={range2}
              min={dataMin2}
              max={dataMax2}
              step={(dataMax2 - dataMin2) / 100 || 1}
              onChange={(_, v) => {
                const r = v as [number, number];
                setRange2(r);
                setFilterRange2(r);
              }}
              valueLabelDisplay="auto"
              valueLabelFormat={(v) => formatValue(v, isPercentage2, dataMax2)}
              size="small"
            />
          </Box>
          <Box display="flex" justifyContent="space-between">
            <Typography variant="caption" color="text.secondary">
              {formatValue(dataMin2, isPercentage2, dataMax2)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {formatValue(dataMax2, isPercentage2, dataMax2)}
            </Typography>
          </Box>
        </Box>
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
      <ComparisonSection
        dataset={dataset}
        metric={metric}
        dataset2={dataset2}
        metric2={metric2}
        activeGeoid={activeGeoid}
      />
    </Stack>
  );
};
