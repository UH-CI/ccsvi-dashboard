import { useState } from "react";
import { Box } from "@mui/material";
import BarChartIcon from "@mui/icons-material/BarChart";
import { CollapsibleLegend } from "../MapLegend/CollapsibleLegend";
import { DataAnalyzerMenu } from "./DataAnalyzerMenu";

export const DataAnalyzerPanel = () => {
  const [open, setOpen] = useState(false);
  return (
    <CollapsibleLegend
      title="Data Analyzer"
      icon={<BarChartIcon sx={{ fontSize: 18, color: "#444" }} />}
      open={open}
      onToggle={() => setOpen((v) => !v)}
      order={0}
    >
      <Box sx={{ width: 240, whiteSpace: "normal" }}>
        <DataAnalyzerMenu />
      </Box>
    </CollapsibleLegend>
  );
};
