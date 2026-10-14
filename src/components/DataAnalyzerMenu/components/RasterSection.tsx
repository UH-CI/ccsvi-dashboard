import { useMemo } from "react";
import { Box, Typography } from "@mui/material";
import { useMapStore } from "../../../stores";
import { useRasterLayersStore } from "../../../stores/useRasterLayersStore";
import { deriveVisibleRasters } from "../deriveRaster";

export const RasterSection: React.FC = () => {
  const primaryMapId = useMapStore((state) => state.primaryMapId);
  const visibleLayerIdsByMap = useRasterLayersStore((state) => state.visibleLayerIdsByMap);
  const rasterLayerConfigs = useRasterLayersStore((state) => state.rasterLayerConfigs);

  const derivedRasters = useMemo(
    () => deriveVisibleRasters(visibleLayerIdsByMap[primaryMapId], rasterLayerConfigs),
    [visibleLayerIdsByMap, primaryMapId, rasterLayerConfigs],
  );

  if (derivedRasters.length === 0) {
    return null;
  }

  return (
    <Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}
      >
        Raster
      </Typography>
      {derivedRasters.map((raster) => (
        <Typography key={raster.rasterId} variant="body2" sx={{ fontWeight: 500, mt: 0.25 }}>
          {raster.label}
        </Typography>
      ))}
    </Box>
  );
};
