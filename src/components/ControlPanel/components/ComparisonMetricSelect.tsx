import React from "react";
import { FormControl, InputLabel, Select, MenuItem, ListSubheader } from "@mui/material";
import { SVI_CATEGORIES } from "../../../config/sviCategories";
import { useDatasets } from "../../../api/queries/datasets";
import { useMetric } from "../../../api/queries/metrics";

interface ComparisonMetricSelectProps {
  // The main indicator's key, and the comparison indicator's
  metric: string;
  metric2?: string;
  onChange: (next: { metric2?: string }) => void;
  label?: string;
}

// Reusable bivariate "Compare with" selection. Lists the SVI menu's indicators
// whose dataset matches the primary's Hawaiian-homelands flag, grouped by menu category
export const ComparisonMetricSelect: React.FC<ComparisonMetricSelectProps> = ({
  metric,
  metric2,
  onChange,
  label = "Compare with",
}) => {
  const datasets = useDatasets();
  const primary = useMetric(metric);

  return (
    <FormControl size="small" fullWidth>
      <InputLabel>{label}</InputLabel>
      <Select
        value={metric2 ?? ""}
        onChange={(e) => onChange({ metric2: e.target.value || undefined })}
        label={label}
      >
        <MenuItem value="">
          <em>None (univariate)</em>
        </MenuItem>
        {datasets &&
          (() => {
            const primaryIsHawaiian = primary?.dataset.hawaiian_homelands ?? false;
            return SVI_CATEGORIES.map((category) => {
              const indicators = category.indicators.filter(
                (ind) =>
                  (datasets[ind.dataset]?.hawaiian_homelands ?? false) === primaryIsHawaiian &&
                  ind.key !== metric,
              );
              if (indicators.length === 0) return [];
              return [
                <ListSubheader key={`hdr-${category.id}`}>{category.label}</ListSubheader>,
                ...indicators.map((ind) => (
                  <MenuItem key={ind.key} value={ind.key}>
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
