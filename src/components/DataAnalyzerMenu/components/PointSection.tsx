import { useMemo } from "react";
import { Box, Typography, FormControlLabel, Checkbox } from "@mui/material";
import { useMapStore, usePointLayerStore, useFilterStore } from "../../../stores";
import {
  deriveVisibleCriticalInfrastructure,
  deriveVisibleLocationsOfEnhancedExposure,
} from "../derivePoints";

interface PointSectionProps {
  menu: "criticalInfrastructure" | "locationsOfEnhancedExposure";
  title: string;
}

export const PointSection: React.FC<PointSectionProps> = ({ menu, title }) => {
  const primaryMapId = useMapStore((state) => state.primaryMapId);
  const visibleLayerIdsByMap = usePointLayerStore((state) => state.visibleLayerIdsByMap);
  const pointLayerFilters = useFilterStore((state) => state.pointLayerFilters);
  const togglePointLayerFilter = useFilterStore((state) => state.togglePointLayerFilter);

  const deriveFn =
    menu === "criticalInfrastructure"
      ? deriveVisibleCriticalInfrastructure
      : deriveVisibleLocationsOfEnhancedExposure;

  const layers = useMemo(
    () => deriveFn(visibleLayerIdsByMap[primaryMapId]),
    [visibleLayerIdsByMap, primaryMapId, deriveFn],
  );

  if (layers.length === 0) return null;

  return (
    <Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}
      >
        {title}
      </Typography>
      <Typography variant="caption" color="text.disabled" display="block" sx={{ mb: 0.5 }}>
        Only layers currently turned on in this map menu are listed
      </Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        {layers.map((layer) => (
          <FormControlLabel
            key={layer.id}
            control={
              <Checkbox
                size="small"
                checked={pointLayerFilters.has(layer.id)}
                onChange={() => togglePointLayerFilter(layer.id)}
              />
            }
            label={layer.name}
            sx={{ display: "flex", m: 0 }}
          />
        ))}
      </Box>
    </Box>
  );
};