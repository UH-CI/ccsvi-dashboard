import React, { useMemo } from "react";
import { useRasterLayersStore, type RasterLegendInfo } from "../../stores";
import { ColorGeneratorService } from "../RasterLayers/color-generator.service";
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

function buildGradientCss(info: RasterLegendInfo): string {
  const gen = new ColorGeneratorService();
  const scale = gen.getDefaultMonochromaticRainfallColorScale([info.min, info.max], false);
  const hexes = scale.getColorsHex();
  const n = hexes.length;
  const step = Math.max(1, Math.floor(n / 16));
  const sampled = hexes.filter((_, i) => i % step === 0 || i === n - 1);
  const stops = sampled
    .map((hex, i) => `${hex} ${(i / Math.max(1, sampled.length - 1)) * 100}%`)
    .join(", ");
  return `linear-gradient(to top, ${stops})`;
}

interface RasterMapLegendProps {
  mapId: string;
}

export const RasterMapLegend: React.FC<RasterMapLegendProps> = ({ mapId }) => {
  const info = useRasterLayersStore((s) => s.rasterLegendByMap[mapId] ?? null);

  const gradient = useMemo(() => (info ? buildGradientCss(info) : null), [info]);

  if (!info || !gradient) return null;

  const widthPx = info.legendWidthPx ?? RASTER_LEGEND_DEFAULT_WIDTH_PX;
  const gradientHeightPx =
    info.legendGradientHeightPx ?? RASTER_LEGEND_DEFAULT_GRADIENT_HEIGHT_PX;

  return (
    <div
      className={`${styles.legend} ${styles["raster-legend"]}`}
      style={{ width: widthPx }}
    >
      <div className={styles["raster-legend__title"]} title={info.title}>
        {info.title}
      </div>
      <div className={styles["raster-legend__row"]}>
        <div
          className={styles["raster-legend__gradient"]}
          style={{ background: gradient, height: gradientHeightPx }}
          aria-hidden
        />
        {info.units?.trim() ? (
          <div
            className={styles["raster-legend__unit-col"]}
            style={{ minHeight: gradientHeightPx }}
            aria-hidden
          >
            <span>{info.units.trim()}</span>
            <span>{info.units.trim()}</span>
          </div>
        ) : null}
        <div
          className={styles["raster-legend__nums"]}
          style={{ minHeight: gradientHeightPx }}
        >
          <span
            title={
              info.units?.trim()
                ? `${formatValue(info.max)}\u00a0${info.units.trim()}`
                : undefined
            }
          >
            {formatValue(info.max)}
          </span>
          <span
            title={
              info.units?.trim()
                ? `${formatValue(info.min)}\u00a0${info.units.trim()}`
                : undefined
            }
          >
            {formatValue(info.min)}
          </span>
        </div>
      </div>
    </div>
  );
};
