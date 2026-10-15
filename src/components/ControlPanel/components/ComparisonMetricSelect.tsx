import React from "react";
import { FormControl, InputLabel, Select, MenuItem, ListSubheader } from "@mui/material";
import { Dataset } from "../../../types";
import { SVI_CATEGORIES } from "../../../config";

interface ComparisonMetricSelectProps {
  blockGroupData: Dataset | null;
  dataset: string;
  metric: string;
  dataset2?: string;
  metric2?: string;
  onChange: (next: { dataset2?: string; metric2?: string }) => void;
  label?: string;
}

// Reusable bivariate "Compare with" selection. Lists the SVI menu's indicators
// whose dataset matches the primary's Hawaiian-homelands flag, grouped by menu category
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
            return SVI_CATEGORIES.map((category) => {
              const indicators = category.indicators.filter(
                (ind) =>
                  (blockGroupData[ind.dataset]?.hawaiianHomelands ?? false) === primaryIsHawaiian &&
                  !(ind.dataset === dataset && ind.metric === metric),
              );
              if (indicators.length === 0) return [];
              return [
                <ListSubheader key={`hdr-${category.id}`}>{category.label}</ListSubheader>,
                ...indicators.map((ind) => (
                  <MenuItem key={`${ind.dataset}::${ind.metric}`} value={`${ind.dataset}::${ind.metric}`}>
                    {ind.label}
                  </MenuItem>
                )),
              ];
            });
          })()}
      </Select>
    </FormControl>
  );
};
