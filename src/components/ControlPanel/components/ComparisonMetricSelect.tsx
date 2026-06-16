import React from "react";
import { FormControl, InputLabel, Select, MenuItem, ListSubheader } from "@mui/material";
import { Dataset } from "../../../types";

interface ComparisonMetricSelectProps {
  blockGroupData: Dataset | null;
  dataset: string;
  metric: string;
  dataset2?: string;
  metric2?: string;
  onChange: (next: { dataset2?: string; metric2?: string }) => void;
  label?: string;
}

// Reusable bivariate "Compare with" selection. Lists every metric whose
// dataset matches the primary's Hawaiian-homelands flag, grouped by dataset
export const ComparisonMetricSelect: React.FC<ComparisonMetricSelectProps> = ({
  blockGroupData,
  dataset,
  metric,
  dataset2,
  metric2,
  onChange,
  label = "Compare with",
}) => {
  return (
    <FormControl size="small" fullWidth>
      <InputLabel>{label}</InputLabel>
      <Select
        value={metric2 ? `${dataset2 ?? dataset}::${metric2}` : ""}
        onChange={(e) => {
          const val = e.target.value;
          if (!val) {
            onChange({ metric2: undefined, dataset2: undefined });
          } else {
            const sepIdx = val.indexOf("::");
            const ds = val.slice(0, sepIdx);
            const m = val.slice(sepIdx + 2);
            onChange({ metric2: m, dataset2: ds !== dataset ? ds : undefined });
          }
        }}
        label={label}
      >
        <MenuItem value="">
          <em>None (univariate)</em>
        </MenuItem>
        {blockGroupData &&
          (() => {
            const primaryIsHawaiian = dataset
              ? (blockGroupData[dataset]?.hawaiianHomelands ?? false)
              : false;
            return Object.entries(blockGroupData)
              .filter(([, dsObj]) => (dsObj.hawaiianHomelands ?? false) === primaryIsHawaiian)
              .map(([dsId, dsObj]) => [
                <ListSubheader key={`hdr-${dsId}`}>
                  {dsObj.metricLabel || dsId.replace(/_/g, " ")}
                </ListSubheader>,
                ...Object.keys(dsObj.columnThresholds || {})
                  .filter((m) => !(dsId === dataset && m === metric))
                  .map((metricName) => (
                    <MenuItem key={`${dsId}::${metricName}`} value={`${dsId}::${metricName}`}>
                      {metricName}
                    </MenuItem>
                  )),
              ]);
          })()}
      </Select>
    </FormControl>
  );
};
