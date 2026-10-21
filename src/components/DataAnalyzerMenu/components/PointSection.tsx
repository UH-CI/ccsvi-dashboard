import { useMemo } from "react";
import { Box, Typography, FormControlLabel, Checkbox, ButtonGroup, Button } from "@mui/material";
import {
  useMapStore,
  usePointLayerStore,
  useFilterStore,
  useHazardLayersStore,
} from "../../../stores";
import {
  deriveVisibleCriticalInfrastructure,
  deriveVisibleLocationsOfEnhancedExposure,
} from "../derivePoints";
import { deriveVisibleHazards } from "../deriveHazard";
import * as FaIcons from "react-icons/fa";

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

  // Shape layers that the control panel shows in this menu
  const visibleHazardIdsByMap = useHazardLayersStore((state) => state.visibleLayerIdsByMap);
  const shapeLayers = useMemo(
    () =>
      deriveVisibleHazards(
        visibleHazardIdsByMap[primaryMapId],
        menu === "criticalInfrastructure" ? "points" : "locations",
      ),
    [visibleHazardIdsByMap, primaryMapId, menu],
  );

  if (layers.length === 0 && shapeLayers.length === 0) return null;

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
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 1, mt: 0.5 }}>
        {layers.map((layer) => {
          const Icon = FaIcons[layer.icon as keyof typeof FaIcons] || FaIcons.FaCircle;
          return (
            // Checkbox hidden for now; every visible point layer counts in the filter
            // <FormControlLabel
            //   key={layer.id}
            //   control={
            //     <Checkbox
            //       size="small"
            //       sx={{ p: 0.25, mr: 0.5 }}
            //       checked={pointLayerFilters.has(layer.id)}
            //       onChange={() => togglePointLayerFilter(layer.id)}
            //     />
            //   }
            //   label={layer.name}
            //   slotProps={{ typography: { variant: "body2", sx: { fontWeight: 500 } } }}
            //   sx={{ display: "flex", m: 0 }}
            // />
            <Box key={layer.id} sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 0.25 }}>
              <Box component="span" sx={{ display: "flex", flex: "none", color: layer.color }}>
                <Icon size="0.875rem" />
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {layer.name}
              </Typography>
            </Box>
          );
        })}
        {shapeLayers.map((shape) => {
          const Icon =
            (shape.icon && FaIcons[shape.icon as keyof typeof FaIcons]) || FaIcons.FaCircle;
          return (
            <Box
              key={`${shape.hazardId}.${shape.subId ?? ""}`}
              sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 0.25 }}
            >
              <Box component="span" sx={{ display: "flex", flex: "none", color: shape.color }}>
                <Icon size="0.875rem" />
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {shape.label}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};