import { useMemo } from "react";
import { Box, Typography, FormControlLabel, Checkbox, ButtonGroup, Button } from "@mui/material";
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
  const pointGroupModes = useFilterStore((state) => state.pointGroupModes);
  const setPointGroupMode = useFilterStore((state) => state.setPointGroupMode);
  const mode = pointGroupModes[menu] ?? "all";

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
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}
        >
          {title}
        </Typography>
      </Box>
      {/*AND/OR switch */}
      {/*  <ButtonGroup size="small">*/}
      {/*    <Button*/}
      {/*      variant={mode === "all" ? "contained" : "outlined"}*/}
      {/*      onClick={() => setPointGroupMode(menu, "all")}*/}
      {/*    >*/}
      {/*      AND*/}
      {/*    </Button>*/}
      {/*    <Button*/}
      {/*      variant={mode === "any" ? "contained" : "outlined"}*/}
      {/*      onClick={() => setPointGroupMode(menu, "any")}*/}
      {/*    >*/}
      {/*      OR*/}
      {/*    </Button>*/}
      {/*  </ButtonGroup>*/}
      {/*</Box>*/}
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", mt: 0.5 }}>
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