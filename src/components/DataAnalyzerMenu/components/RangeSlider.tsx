import { Box, IconButton, Slider, Tooltip, Typography } from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";
import type { SliderRange } from "../../../stores/useFilterStore";
import type { MetricKind } from "../../../types";
import { formatValue } from "../metricValueHelpers";

interface RangeSliderProps {
  title: string;
  // An info icon after the title, with its tooltip and its screen-reader label
  info?: { tooltip: string; label: string };
  bounds: [number, number];
  // The chosen range; null shows the whole range
  value: SliderRange;
  kind: MetricKind;
  onChange: (range: [number, number]) => void;
}

// A Data Analyzer slider: its heading, the two-handled slider, and the lowest and highest values under it
export const RangeSlider: React.FC<RangeSliderProps> = ({
  title,
  info,
  bounds: [min, max],
  value,
  kind,
  onChange,
}) => (
  <Box>
    <Typography variant="sectionHeading">
      {info ? (
        <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.25 }}>
          {title}
          <Tooltip title={info.tooltip} placement="top" disableInteractive>
            <IconButton
              size="small"
              aria-label={info.label}
              sx={{ p: 0.25, ml: 0.5, color: "text.secondary" }}
            >
              <InfoOutlined sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>
      ) : (
        title
      )}
    </Typography>
    <Box sx={{ px: 1, mt: 1 }}>
      <Slider
        value={value ?? [min, max]}
        min={min}
        max={max}
        step={(max - min) / 100 || 1}
        onChange={(_, v) => onChange(v as [number, number])}
        valueLabelDisplay="auto"
        valueLabelFormat={(v) => formatValue(v, kind)}
        size="small"
      />
    </Box>
    <Box display="flex" justifyContent="space-between">
      <Typography variant="caption" color="text.secondary">
        {formatValue(min, kind)}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {formatValue(max, kind)}
      </Typography>
    </Box>
  </Box>
);
