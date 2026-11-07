import React, { useState, useEffect } from "react";
import parseGeoraster from "georaster";
import CloudQueueIcon from "@mui/icons-material/CloudQueue";
import { useHCDPStore } from "../../stores/useHCDPStore";
import { HCDP_PALETTE } from "../../config";
import { cloneArrayBuffer } from "../../utils/hcdpRaster";
import styles from "./MapLegend.module.scss";
import { GradientLegend } from "./GradientLegend";

interface HcdpMapLegendProps {
  mapId: string;
}

export const HcdpMapLegend: React.FC<HcdpMapLegendProps> = ({ mapId }) => {
  const overlay = useHCDPStore((s) => s.overlaysByMap[mapId]);
  const [stats, setStats] = useState<{ min: number; max: number } | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!overlay || !overlay.arrayBuffer) {
      setStats(null);
      return;
    }

    (async () => {
      try {
        const georaster = await parseGeoraster(cloneArrayBuffer(overlay.arrayBuffer));
        if (cancelled) return;

        const firstValue = georaster.values?.[0]?.[0]?.[0];
        const metaNoData = georaster.noDataValue;

        const checkIsNoData = (v: number | null | undefined): boolean => {
          if (v == null || Number.isNaN(v)) return true;
          if (v === firstValue) return true; 
          if (v === metaNoData) return true; 
          if (v === -9999 || v <= -3.4e38) return true; 
          return false;
        };

        const band = georaster.values[0];
        const width = georaster.width;
        const height = georaster.height;

        let min = Infinity;
        let max = -Infinity;
        for (let r = 0; r < height; r++) {
          const rowData = band[r];
          if (!rowData) continue;
          for (let c = 0; c < width; c++) {
            const v = rowData[c];
            if (!checkIsNoData(v)) {
              if (v < min) min = v;
              if (v > max) max = v;
            }
          }
        }

        if (min === Infinity || max === -Infinity) {
          min = georaster.mins?.[0] ?? georaster.min ?? 0;
          max = georaster.maxs?.[0] ?? georaster.max ?? 1;
        }

        if (!cancelled) {
          setStats({ min, max });
        }
      } catch (err) {
        console.error("Error calculating legend min/max from georaster:", err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [overlay]);

  // Gracefully hide the legend entirely if no HCDP overlay or data stats are loaded
  if (!overlay || !stats) return null;

  return (
    <GradientLegend
      title={overlay.title}
      icon={<CloudQueueIcon className={styles["legend-icon"]} />}
      gradient={`linear-gradient(to top, ${HCDP_PALETTE.join(", ")})`}
      min={stats.min}
      max={stats.max}
    />
  );
};