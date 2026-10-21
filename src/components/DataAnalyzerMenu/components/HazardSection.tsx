import { useMemo } from "react";
import { Box, Typography } from "@mui/material";
import { useMapStore, useHazardLayersStore, useRasterLayersStore } from "../../../stores";
import { deriveVisibleHazards } from "../deriveHazard";
import { deriveVisibleRasters } from "../deriveRaster";

// Mirrors the control panel's Hazards menu: its hazard layers, then rasters
export const HazardSection: React.FC = () => {
  const primaryMapId = useMapStore((state) => state.primaryMapId);
  const visibleLayerIdsByMap = useHazardLayersStore((state) => state.visibleLayerIdsByMap);
  const visibleRasterIdsByMap = useRasterLayersStore((state) => state.visibleLayerIdsByMap);
  const rasterLayerConfigs = useRasterLayersStore((state) => state.rasterLayerConfigs);

  const items = useMemo(
    () => [
      ...deriveVisibleHazards(visibleLayerIdsByMap[primaryMapId], "hazards").map((h) => ({
        key: `${h.hazardId}.${h.subId ?? ""}`,
        label: h.label,
      })),
      ...deriveVisibleRasters(visibleRasterIdsByMap[primaryMapId], rasterLayerConfigs).map((r) => ({
        key: r.rasterId,
        label: r.label,
      })),
    ],
    [visibleLayerIdsByMap, visibleRasterIdsByMap, rasterLayerConfigs, primaryMapId],
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 700 }}
      >
        Hazards
      </Typography>
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 1, mt: 0.5 }}>
        {items.map((item) => (
          <Typography key={item.key} variant="body2" sx={{ fontWeight: 500, mt: 0.25 }}>
            {item.label}
          </Typography>
        ))}
      </Box>
    </Box>
  );
};