import { useMemo } from "react";
import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";
import { CHART_COLORS } from "../../../config";
import type { MetricKind } from "../../../types";
import { formatValue } from "../metricValueHelpers";
import { meanMedian } from "./analyzerStats";

interface MatchSummaryProps {
  kind: MetricKind;
  // The selected area's number, or null when none is selected or it has no value
  activeValue: number | null;
  allValues: number[];
  matchedValues: number[];
}

// One summary figure: its name, the matching areas' value, and all areas' value when not all match
const Figure = ({ name, value, all }: { name: string; value: string; all?: string }) => (
  <Box textAlign="center">
    <Typography variant="caption" color="text.secondary" display="block">
      {name}
    </Typography>
    <Typography variant="body2" sx={{ fontWeight: 600 }}>
      {value}
    </Typography>
    {all && (
      <Typography variant="caption" color="text.secondary" display="block">
        all {all}
      </Typography>
    )}
  </Box>
);

// "Summary for Matching Areas": the selected area's value, and the mean and median of the matching areas
export const MatchSummary: React.FC<MatchSummaryProps> = ({
  kind,
  activeValue,
  allValues,
  matchedValues,
}) => {
  const stats = useMemo(() => meanMedian(allValues), [allValues]);
  const matchedStats = useMemo(() => meanMedian(matchedValues), [matchedValues]);
  if (!stats) return null;

  const notAllMatch = matchedValues.length !== allValues.length;
  const show = (v: number) => formatValue(v, kind);

  return (
    <>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
        <Typography variant="sectionHeading">Summary for Matching Areas</Typography>
        <Tooltip
          title="Displays the mean/ median value of the selected vulnerability indicator for areas where all chosen layers overlap."
          placement="top"
          disableInteractive
        >
          <IconButton
            size="small"
            aria-label="About summary statistics"
            sx={{ p: 0.25, ml: 0.5, color: "text.secondary" }}
          >
            <InfoOutlined sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>
      <Box display="flex" justifyContent="space-around">
        {activeValue != null && (
          <Box textAlign="center">
            <Typography variant="caption" color="text.secondary" display="block">
              Selected area
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: CHART_COLORS.selected }}>
              {show(activeValue)}
            </Typography>
          </Box>
        )}
        <Figure
          name="Mean"
          value={matchedStats ? show(matchedStats.mean) : "–"}
          all={notAllMatch ? show(stats.mean) : undefined}
        />
        <Figure
          name="Median"
          value={matchedStats ? show(matchedStats.median) : "–"}
          all={notAllMatch ? show(stats.median) : undefined}
        />
      </Box>
    </>
  );
};
