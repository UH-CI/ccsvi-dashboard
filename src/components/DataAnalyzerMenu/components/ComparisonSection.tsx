import { useMemo } from "react";
import { Box, Typography } from "@mui/material";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { useAppStore, useFilteredGeoids } from "../../../stores";
import { pickValue, formatValue } from "../metricValueHelpers";

interface ComparisonSectionProps {
  dataset: string | undefined;
  metric: string | undefined;
  dataset2: string | undefined;
  metric2: string | undefined;
  activeGeoid: string | null;
}

const RED = "#e53935";
const BLUE = "#1976d2";
const GRAY = "#d0d0d0";

export const ComparisonSection: React.FC<ComparisonSectionProps> = ({
  dataset,
  metric,
  dataset2,
  metric2,
  activeGeoid,
}) => {
  const metricValuesCache = useAppStore((state) => state.metricValuesCache);
  const geographiesData = useAppStore((state) => state.geographiesData);
  const filteredGeoids = useFilteredGeoids();

  const cacheKey1 = dataset && metric ? `${dataset}::${metric}` : null;
  const cacheKey2 = dataset2 && metric2 ? `${dataset2}::${metric2}` : null;
  const cachedValues1 = cacheKey1 ? metricValuesCache[cacheKey1] : null;
  const cachedValues2 = cacheKey2 ? metricValuesCache[cacheKey2] : null;

  const { points, activePoint, isPct1, isPct2, maxX, maxY } = useMemo(() => {
    if (!cachedValues1 || !cachedValues2) {
      return { points: [], activePoint: null, isPct1: false, isPct2: false, maxX: 1, maxY: 1 };
    }
    const isPct1 = Object.values(cachedValues1).some((e) => e.percentage != null);
    const isPct2 = Object.values(cachedValues2).some((e) => e.percentage != null);
    const pts: { geoid: string; x: number; y: number }[] = [];
    let active: { geoid: string; x: number; y: number } | null = null;
    for (const geoid of Object.keys(cachedValues1)) {
      const x = pickValue(cachedValues1[geoid]);
      const y = pickValue(cachedValues2[geoid]);
      if (x === null || y === null) continue;
      const point = { geoid, x, y };
      if (geoid === activeGeoid) active = point;
      else pts.push(point);
    }
    const allX = active ? [...pts.map((p) => p.x), active.x] : pts.map((p) => p.x);
    const allY = active ? [...pts.map((p) => p.y), active.y] : pts.map((p) => p.y);
    const maxX = allX.length ? Math.max(...allX) : 1;
    const maxY = allY.length ? Math.max(...allY) : 1;
    return { points: pts, activePoint: active, isPct1, isPct2, maxX, maxY };
  }, [cachedValues1, cachedValues2, activeGeoid]);

  if (!metric2) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
        Set a "Compare with" metric on the map (Social Vulnerability Indicators menu) to plot
        it against {metric ?? "the selected metric"}.
      </Typography>
    );
  }

  if (points.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
        Loading data…
      </Typography>
    );
  }

  return (
    <Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}
      >
        Compare
      </Typography>
      <Typography
        variant="body2"
        sx={{ fontWeight: 500, mt: 0.25 }}
        noWrap
        title={`${metric} vs ${metric2}`}
      >
        {metric} vs {metric2}
      </Typography>

      <ResponsiveContainer width="100%" height={200}>
        <ScatterChart margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <XAxis type="number" dataKey="x" tickFormatter={(v) => formatValue(v, isPct1, maxX)} tick={{ fontSize: 10 }} />
          <YAxis type="number" dataKey="y" tickFormatter={(v) => formatValue(v, isPct2, maxY)} tick={{ fontSize: 10 }} width={40} />
          <RechartsTooltip
            cursor={{ strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const point = payload[0].payload as { geoid: string; x: number; y: number };
              const label = geographiesData?.[point.geoid]?.name ?? point.geoid;
              return (
                <Box sx={{ bgcolor: "background.paper", p: 1, borderRadius: 1, boxShadow: 1 }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, display: "block" }}>
                    {label}
                  </Typography>
                  <Typography variant="caption" display="block">
                    {metric}: {formatValue(point.x, isPct1, maxX)}
                  </Typography>
                  <Typography variant="caption" display="block">
                    {metric2}: {formatValue(point.y, isPct2, maxY)}
                  </Typography>
                </Box>
              );
            }}
          />
          <Scatter
            data={points}
            isAnimationActive={false}
            shape={(props: any) => {
              const { cx, cy, payload } = props;
              const inFilter = filteredGeoids ? filteredGeoids.has(payload.geoid) : true;
              return (
                <circle cx={cx} cy={cy} r={2.5} fill={inFilter ? BLUE : GRAY} fillOpacity={0.6} />
              );
            }}
          />
          {activePoint && (
            <Scatter
              data={[activePoint]}
              isAnimationActive={false}
              shape={(props: any) => {
                const { cx, cy } = props;
                return (
                  <g>
                    <circle cx={cx} cy={cy} r={6} fill="#fff" fillOpacity={0.9} />
                    <circle cx={cx} cy={cy} r={4} fill={RED} />
                  </g>
                );
              }}
            />
          )}
        </ScatterChart>
      </ResponsiveContainer>
    </Box>
  );
};