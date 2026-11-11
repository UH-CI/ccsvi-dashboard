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
import { useFilteredGeoids } from "../../../api/queries/filter";
import { formatValue } from "../metricValueHelpers";
import { CHART_COLORS, sviLabel } from "../../../config";
import { useGeographies } from "../../../api/queries/geographies";
import { useMetricKind } from "../../../api/queries/datasets";
import { metricNumber, useMetricValues } from "../../../api/queries/metricValues";

interface ComparisonSectionProps {
  dataset: string | undefined;
  metric: string | undefined;
  dataset2: string | undefined;
  metric2: string | undefined;
  activeGeoid: string | null;
}

export const ComparisonSection: React.FC<ComparisonSectionProps> = ({
  dataset,
  metric,
  dataset2,
  metric2,
  activeGeoid,
}) => {
  const geographiesData = useGeographies();
  const filteredGeoids = useFilteredGeoids();

  const cachedValues1 = useMetricValues(dataset, metric);
  const cachedValues2 = useMetricValues(dataset2, metric2);

  const kind1 = useMetricKind(dataset, metric);
  const kind2 = useMetricKind(dataset2, metric2);

  const { points, activePoint } = useMemo(() => {
    if (!cachedValues1 || !cachedValues2 || !kind1 || !kind2) {
      return { points: [], activePoint: null };
    }
    const pts: { geoid: string; x: number; y: number }[] = [];
    let active: { geoid: string; x: number; y: number } | null = null;
    for (const geoid of Object.keys(cachedValues1)) {
      const x = metricNumber(cachedValues1[geoid], kind1);
      const y = metricNumber(cachedValues2[geoid], kind2);
      if (x === null || y === null) continue;
      const point = { geoid, x, y };
      if (geoid === activeGeoid) active = point;
      else pts.push(point);
    }
    return { points: pts, activePoint: active };
  }, [cachedValues1, cachedValues2, kind1, kind2, activeGeoid]);

  const label1 = metric ? sviLabel(dataset, metric) : undefined;
  const label2 = metric2 ? sviLabel(dataset2, metric2) : undefined;

  if (!metric2) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
        Set a "Compare with" metric on the map (Social Vulnerability Indicators menu) to plot it
        against {label1 ?? "the selected metric"}.
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
      <Typography variant="sectionHeading">Compare</Typography>
      <Typography
        variant="body2"
        sx={{ fontWeight: 500, mt: 0.25 }}
        noWrap
        title={`${label1} vs ${label2}`}
      >
        {label1} vs {label2}
      </Typography>

      <ResponsiveContainer width="100%" height={200}>
        <ScatterChart margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <XAxis type="number" dataKey="x" tickFormatter={(v) => formatValue(v, kind1!)} tick={{ fontSize: 10 }} />
          <YAxis type="number" dataKey="y" tickFormatter={(v) => formatValue(v, kind2!)} tick={{ fontSize: 10 }} width={40} />
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
                    {label1}: {formatValue(point.x, kind1!)}
                  </Typography>
                  <Typography variant="caption" display="block">
                    {label2}: {formatValue(point.y, kind2!)}
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
                <circle
                  cx={cx}
                  cy={cy}
                  r={2.5}
                  fill={inFilter ? CHART_COLORS.matching : CHART_COLORS.notMatching}
                  fillOpacity={0.6}
                />
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
                    <circle cx={cx} cy={cy} r={4} fill={CHART_COLORS.selected} />
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