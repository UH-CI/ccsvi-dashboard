import React from "react";
import { IconButton, Tooltip } from "@mui/material";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

interface AnalyzerInfoProps {
  label: string;
  description: string;
}

export const AnalyzerInfo: React.FC<AnalyzerInfoProps> = ({ label, description }) => (
  <Tooltip title={description} enterTouchDelay={0} leaveTouchDelay={5000}>
    <IconButton
      size="small"
      aria-label={label}
      sx={{ p: 0.25, color: "text.secondary" }}
    >
      <InfoOutlinedIcon sx={{ fontSize: 16 }} />
    </IconButton>
  </Tooltip>
);
