import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import { AspectRatio, Close } from "@mui/icons-material";
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
import { SectionHeading } from "./SectionHeading";

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
  const [poppedOut, setPoppedOut] = useState(false);

  // Removing the comparison closes the pop-out, so it doesn't reopen with the next comparison
  useEffect(() => {
    if (!metric2) setPoppedOut(false);
  }, [metric2]);

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
        Set a "Compare with" metric on the map (Community Characteristics menu) to plot it against{" "}
        {label1 ?? "the selected metric"}.
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

  // The scatter plot at a given height, shown in the panel and again larger in the pop-out
  const plot = (height: number) => (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <XAxis
          type="number"
          dataKey="x"
          tickFormatter={(v) => formatValue(v, kind1!)}
          tick={{ fontSize: 10 }}
        />
        <YAxis
          type="number"
          dataKey="y"
          tickFormatter={(v) => formatValue(v, kind2!)}
          tick={{ fontSize: 10 }}
          width={40}
        />
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
                onClick={
                  inFilter
                    ? () => updateMapActiveFeature(primaryMapId, { geoid: payload.geoid })
                    : undefined
                }
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
  );

  return (
    <Box>
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <SectionHeading
          title="Comparison Scatter Plot"
          info={{
            tooltip:
              "Each dot is a block group, placed by its value for the selected characteristic (across) and the comparison characteristic (up). Gray dots don't match the current filter. Click a dot to select that area on the map.",
            label: "About comparison scatter plot",
          }}
        />
        <Tooltip title="Pop out scatter plot">
          <IconButton size="small" onClick={() => setPoppedOut(true)}>
            <AspectRatio sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>
      <Typography
        variant="body2"
        sx={{ fontWeight: 500, mt: 0.25 }}
        noWrap
        title={`${label1} vs ${label2}`}
      >
        {label1} vs {label2}
      </Typography>

      {poppedOut ? (
        // Stands in for the plot while it's popped out; a click on it lands on the dimmed backdrop, which closes it
        <Box
          sx={{
            height: 200,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "#f5f5f5",
            borderRadius: 1,
            cursor: "pointer",
          }}
        >
          <Typography variant="body2" color="text.secondary">
            Scatter plot is popped out
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Click to bring it back
          </Typography>
        </Box>
      ) : (
        plot(200)
      )}

      {/* The dimmed backdrop keeps the map from being used while it's open; the first click on it
          only closes the pop-out */}
      <Dialog
        open={poppedOut}
        onClose={() => setPoppedOut(false)}
        maxWidth={false}
        slotProps={{ paper: { sx: { width: "min(900px, calc(100vw - 32px))" } } }}
      >
        <DialogTitle
          sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
        >
          {label1} vs {label2}
          <IconButton
            onClick={() => setPoppedOut(false)}
            size="small"
            aria-label="Close scatter plot"
          >
            <Close fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>{plot(450)}</DialogContent>
      </Dialog>
    </Box>
  );
};
