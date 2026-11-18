import { Box } from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { CHART_COLORS } from "../../../config/colorSchemes";
import type { Bin } from "./analyzerStats";
import { SectionHeading } from "./SectionHeading";

interface DistributionChartProps {
  bins: Bin[];
  // The label of the bar the selected area falls in, marked with a line; null when no area is selected
  activeBinLabel: string | null;
}

// The indicator's distribution: one stacked bar per value band, matching areas below the rest
export const DistributionChart: React.FC<DistributionChartProps> = ({ bins, activeBinLabel }) => (
  <Box>
    <SectionHeading
      title="Block Group Distribution"
      info={{
        tooltip:
          "Shows how many block groups fall into each value range of the selected community characteristic. Colored bars are block groups that match the current filter, gray bars are those that don't, and a dashed line marks the selected area.",
        label: "About block group distribution",
      }}
    />
    <ResponsiveContainer width="100%" height={100}>
      <BarChart data={bins} margin={{ top: 8, right: 0, bottom: 0, left: 0 }} barCategoryGap={2}>
        <XAxis dataKey="label" hide />
        <YAxis hide />
        <RechartsTooltip
          cursor={{ fill: "rgba(0,0,0,0.05)" }}
          formatter={(v, name) => [v != null ? `${v} block groups` : "–", name]}
          labelFormatter={(label) => (label != null ? String(label) : "")}
          contentStyle={{ fontSize: "0.75rem", borderRadius: 8 }}
        />
        <Bar dataKey="matched" name="Matching" stackId="bin" fill={CHART_COLORS.matching} />
        <Bar
          dataKey="rest"
          name="Not matching"
          stackId="bin"
          fill={CHART_COLORS.notMatching}
          radius={[2, 2, 0, 0]}
        />
        {activeBinLabel && (
          <ReferenceLine
            x={activeBinLabel}
            stroke={CHART_COLORS.selected}
            strokeWidth={2}
            strokeDasharray="4 2"
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  </Box>
);
