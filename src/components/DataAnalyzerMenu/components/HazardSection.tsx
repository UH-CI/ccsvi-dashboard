import { useMemo } from "react";
import { Box, Typography } from "@mui/material";
import { useMapStore, useHazardLayersStore } from "../../../stores";
import { deriveVisibleHazards } from "../deriveHazard";

export const HazardSection: React.FC = () => {
  const primaryMapId = useMapStore((state) => state.primaryMapId);
  const visibleLayerIdsByMap = useHazardLayersStore((state) => state.visibleLayerIdsByMap);

  const derivedHazards = useMemo(
    () => deriveVisibleHazards(visibleLayerIdsByMap[primaryMapId]),
    [visibleLayerIdsByMap, primaryMapId],
  );

  if (derivedHazards.length === 0) {
    return null;
  }

  return (
    <Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}
      >
        Hazard
      </Typography>
      {derivedHazards.map((hazard) => (
        <Typography
          key={`${hazard.hazardId}.${hazard.subId ?? ""}`}
          variant="body2"
          sx={{ fontWeight: 500, mt: 0.25 }}
        >
          {hazard.label}
        </Typography>
      ))}
    </Box>
  );
};