import { useMemo } from "react";
import { Box, Typography } from "@mui/material";
import * as FaIcons from "react-icons/fa";
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
        icon: h.icon,
        color: h.color,
        fallbackIcon: "FaExclamationTriangle" as const,
      })),
      ...deriveVisibleRasters(visibleRasterIdsByMap[primaryMapId], rasterLayerConfigs).map((r) => ({
        key: r.rasterId,
        label: r.label,
        icon: r.icon,
        color: r.color,
        fallbackIcon: "FaMap" as const,
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
        {items.map((item) => {
          const Icon =
            (item.icon && FaIcons[item.icon as keyof typeof FaIcons]) || FaIcons[item.fallbackIcon];
          return (
            <Box key={item.key} sx={{ display: "flex", alignItems: "center", gap: 0.75, mt: 0.25 }}>
              <Box component="span" sx={{ display: "flex", flex: "none", color: item.color }}>
                <Icon size="0.875rem" />
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {item.label}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};