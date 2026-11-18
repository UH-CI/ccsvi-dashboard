import { useMemo } from "react";
import { Box, Typography } from "@mui/material";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  type ScatterShapeProps,
} from "recharts";
import { useFilteredGeoids } from "../../../api/queries/filter";
import { formatValue } from "../metricValueHelpers";
import { CHART_COLORS } from "../../../config/colorSchemes";
import { sviLabel } from "../../../config/sviCategories";
import { useGeographies } from "../../../api/queries/geographies";
import { useMetric } from "../../../api/queries/metrics";
import { metricNumber, useMetricValues } from "../../../api/queries/metricValues";
import { useMapStore } from "../../../stores/useMapStore";

interface ComparisonSectionProps {
  // The main map's indicator key and its comparison indicator's key
  metric: string | undefined;
  metric2: string | undefined;
  activeGeoid: string | null;
}

export const ComparisonSection: React.FC<ComparisonSectionProps> = ({
  metric,
  metric2,
  activeGeoid,
}) => {
  const geographiesData = useGeographies();
  const filteredGeoids = useFilteredGeoids();
  const primaryMapId = useMapStore((state) => state.primaryMapId);
  const updateMapActiveFeature = useMapStore((state) => state.updateMapActiveFeature);

  const cachedValues1 = useMetricValues(metric);
  const cachedValues2 = useMetricValues(metric2);

  const kind1 = useMetric(metric)?.kind;
  const kind2 = useMetric(metric2)?.kind;

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

  const label1 = metric ? sviLabel(metric) : undefined;
  const label2 = metric2 ? sviLabel(metric2) : undefined;

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
            shape={(props: ScatterShapeProps) => {
              const { cx, cy, payload } = props;
              const inFilter = filteredGeoids ? filteredGeoids.has(payload.geoid) : true;
              // Clicking a dot the Filter kept selects its area on the main map
              return (
                <circle
                  cx={cx}
                  cy={cy}
                  r={2.5}
                  fill={inFilter ? CHART_COLORS.matching : CHART_COLORS.notMatching}
                  fillOpacity={0.6}
                  style={inFilter ? { cursor: "pointer" } : undefined}
                  onClick={inFilter ? () => updateMapActiveFeature(primaryMapId, { geoid: payload.geoid }) : undefined}
                />
              );
            }}
          />
          {activePoint && (
            <Scatter
              data={[activePoint]}
              isAnimationActive={false}
              shape={(props: ScatterShapeProps) => {
                const { cx, cy } = props;
                // Clicking the selected area's dot clears the selection
                return (
                  <g
                    style={{ cursor: "pointer" }}
                    onClick={() => updateMapActiveFeature(primaryMapId, undefined)}
                  >
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