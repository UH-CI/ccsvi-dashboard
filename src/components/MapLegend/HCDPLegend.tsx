import React, { useState, useEffect } from "react";
import parseGeoraster from "georaster";
import { useHCDPStore } from "../../stores/useHCDPStore";
import { cloneArrayBuffer } from "../../utils/hcdpRaster";
import {
  RASTER_LEGEND_DEFAULT_GRADIENT_HEIGHT_PX,
  RASTER_LEGEND_DEFAULT_WIDTH_PX,
} from "./rasterLegendDefaults";
import styles from "./MapLegend.module.scss";

function formatValue(v: number): string {
  if (!Number.isFinite(v)) return "";
  const a = Math.abs(v);
  if (a >= 10000 || (a > 0 && a < 0.001)) return v.toExponential(2);
  return a >= 100 ? v.toFixed(1) : a >= 10 ? v.toFixed(2) : v.toFixed(3);
}

interface HcdpMapLegendProps {
  mapId: string;
  dataType?: string; // Kept for backwards compatibility if needed elsewhere
}

export const HcdpMapLegend: React.FC<HcdpMapLegendProps> = ({ mapId, dataType }) => {
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

  const widthPx = RASTER_LEGEND_DEFAULT_WIDTH_PX;
  const gradientHeightPx = RASTER_LEGEND_DEFAULT_GRADIENT_HEIGHT_PX;

  // Emulates the exact chroma-js scale colors applied in HCDPRasterLayer.tsx
  const gradient = "linear-gradient(to top, #313695, #74add1, #fee090, #f46d43, #a50026)";
  
  // Safely grab units from the row payload if they exist
  const units = (overlay.row as any)?.units?.trim() || (overlay.row as any)?.unit?.trim() || "";

  return (
    <div
      className={`${styles.legend} ${styles["raster-legend"]}`}
      style={{ width: widthPx }}
    >
      <div className={styles["raster-legend__title"]} title={overlay.title}>
        {overlay.title}
      </div>
      <div className={styles["raster-legend__row"]}>
        <div
          className={styles["raster-legend__gradient"]}
          style={{ background: gradient, height: gradientHeightPx }}
          aria-hidden
        />
        {units ? (
          <div
            className={styles["raster-legend__unit-col"]}
            style={{ minHeight: gradientHeightPx }}
            aria-hidden
          >
            <span>{units}</span>
            <span>{units}</span>
          </div>
        ) : null}
        <div
          className={styles["raster-legend__nums"]}
          style={{ minHeight: gradientHeightPx }}
        >
          <span
            title={
              units
                ? `${formatValue(stats.max)}\u00a0${units}`
                : undefined
            }
          >
            {formatValue(stats.max)}
          </span>
          <span
            title={
              units
                ? `${formatValue(stats.min)}\u00a0${units}`
                : undefined
            }
          >
            {formatValue(stats.min)}
          </span>
        </div>
      </div>
    </div>
  );
};