import { Box, Slider, Typography } from "@mui/material";
import type { SliderRange } from "../../../stores/useFilterStore";
import type { MetricKind } from "../../../types";
import { formatValue } from "../metricValueHelpers";
import { SectionHeading, type Info } from "./SectionHeading";

interface RangeSliderProps {
  title: string;
  info?: Info;
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
    <SectionHeading title={title} info={info} />
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
