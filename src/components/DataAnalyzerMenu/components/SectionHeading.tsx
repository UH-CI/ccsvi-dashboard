import { Box, IconButton, Tooltip, Typography } from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";

// An info icon's hover text and its screen-reader label
export interface Info {
  tooltip: string;
  label: string;
}

// An info icon that shows its text on hover
export const InfoTip: React.FC<Info> = ({ tooltip, label }) => (
  <Tooltip title={tooltip} placement="top" disableInteractive>
    <IconButton size="small" aria-label={label} sx={{ p: 0.25, ml: 0.5, color: "text.secondary" }}>
      <InfoOutlined sx={{ fontSize: 16 }} />
    </IconButton>
  </Tooltip>
);

// A Data Analyzer section's heading, with an info icon after it when given one
export const SectionHeading: React.FC<{ title: string; info?: Info }> = ({ title, info }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
    <Typography variant="sectionHeading">{title}</Typography>
    {info && <InfoTip {...info} />}
  </Box>
);
