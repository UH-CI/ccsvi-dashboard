import { useMemo } from "react";
import { Box, Typography } from "@mui/material";
import { useMapStore, useHazardLayersStore } from "../../../stores";
import { deriveHazard } from "../deriveHazard";

export const HazardSection: React.FC = () => {
  const primaryMapId = useMapStore((state) => state.primaryMapId);
  const visibleLayerIdsByMap = useHazardLayersStore((state) => state.visibleLayerIdsByMap);

  const derivedHazard = useMemo(
    () => deriveHazard(visibleLayerIdsByMap[primaryMapId]),
    [visibleLayerIdsByMap, primaryMapId],
  );

  if (!derivedHazard) {
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
      <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.25 }}>
        {derivedHazard.label}
      </Typography>
    </Box>
  );
};