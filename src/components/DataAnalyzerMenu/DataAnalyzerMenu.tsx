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
import { useAppStore, useMapStore } from "../../stores";
import { MetricValue } from "../../types";

const NUM_BINS = 20;

function pickValue(entry: MetricValue | undefined): number | null {
  if (!entry) return null;
  if (entry.percentage != null) {
    const n = Number(entry.percentage);
    if (!isNaN(n)) return n;
  }
  if (entry.absolute != null) {
    const n = Number(entry.absolute);
    if (!isNaN(n)) return n;
  }
  return null;
}

function formatValue(v: number, isPercentage: boolean, maxVal?: number): string {
  if (!isPercentage) return v.toFixed(0);
  // If max value is already > 1 the backend stored percentages in 0–100 form
  const alreadyScaled = maxVal != null && maxVal > 1;
  return alreadyScaled ? `${v.toFixed(1)}%` : `${(v * 100).toFixed(1)}%`;
}

export const DataAnalyzerMenu = () => {
  const mapConfigs = useMapStore((state) => state.mapConfigs);
  const primaryMapId = useMapStore((state) => state.primaryMapId);
  const metricValuesCache = useAppStore((state) => state.metricValuesCache);
  const setFilterRange = useAppStore((state) => state.setFilterRange);

  const primaryConfig = mapConfigs.find((c) => c.id === primaryMapId);
  const dataset = primaryConfig?.dataset;
  const metric = primaryConfig?.metric;
  const activeGeoid = primaryConfig?.activeFeature?.geoid ?? null;
  const cacheKey = dataset && metric ? `${dataset}::${metric}` : null;
  const cachedValues = cacheKey ? metricValuesCache[cacheKey] : null;

  const { allValues, isPercentage } = useMemo(() => {
    if (!cachedValues) return { allValues: [], isPercentage: false };
    const entries = Object.values(cachedValues);
    const usePct = entries.some((e) => e.percentage != null);
    const vals = entries.map(pickValue).filter((v): v is number => v !== null);
    return { allValues: vals, isPercentage: usePct };
  }, [cachedValues]);

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
    }));
    for (const v of allValues) {
      const idx = Math.min(Math.floor((v - dataMin) / step), NUM_BINS - 1);
      bins[idx].count++;
    }
    return { bins, dataMin, dataMax };
  }, [allValues, isPercentage]);

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

  const stats = useMemo(() => {
    if (allValues.length === 0) return null;
    const sorted = [...allValues].sort((a, b) => a - b);
    const mean = allValues.reduce((sum, v) => sum + v, 0) / allValues.length;
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
    return { mean, median };
  }, [allValues]);

  const [range, setRange] = useState<[number, number]>([0, 1]);

  useEffect(() => {
    setRange([dataMin, dataMax]);
    setFilterRange(null);
  }, [dataMin, dataMax, setFilterRange]);

  const filteredCount = useMemo(
    () => allValues.filter((v) => v >= range[0] && v <= range[1]).length,
    [allValues, range],
  );

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
        <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.25 }} noWrap title={metric}>
          {metric}
        </Typography>
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
              formatter={(v) => [v != null ? `${v} block groups` : "–", "Count"]}
              labelFormatter={(label) => (label != null ? String(label) : "")}
              contentStyle={{ fontSize: "0.75rem", borderRadius: 8 }}
            />
            <Bar
              dataKey="count"
              shape={(props: any) => {
                const { x, y, width, height, start, end } = props;
                const inRange = start <= range[1] && end >= range[0];
                return (
                  <rect
                    x={x}
                    y={y}
                    width={Math.max(width, 0)}
                    height={Math.max(height, 0)}
                    fill={inRange ? "#1976d2" : "#d0d0d0"}
                    rx={2}
                  />
                );
              }}
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
              <Typography variant="caption" color="text.secondary" display="block">Selected</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: "#e53935" }}>
                {formatValue(activeValue, isPercentage, dataMax)}
              </Typography>
            </Box>
          )}
          <Box textAlign="center">
            <Typography variant="caption" color="text.secondary" display="block">Mean</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {formatValue(stats.mean, isPercentage, dataMax)}
            </Typography>
          </Box>
          <Box textAlign="center">
            <Typography variant="caption" color="text.secondary" display="block">Median</Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {formatValue(stats.median, isPercentage, dataMax)}
            </Typography>
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

      <Divider />

      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography variant="body2" color="text.secondary">
          Block groups in range
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {filteredCount} / {allValues.length}
        </Typography>
      </Box>
    </Stack>
  );
};
