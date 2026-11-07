import React from "react";
import TerrainIcon from "@mui/icons-material/Terrain";
import { useRasterLayersStore } from "../../stores";
import { useColormapGradient } from "../../api/queries/colormap";
import {
  RASTER_LEGEND_DEFAULT_GRADIENT_HEIGHT_PX,
  RASTER_LEGEND_DEFAULT_WIDTH_PX,
} from "./rasterLegendDefaults";
import styles from "./MapLegend.module.scss";
import { CollapsibleLegend } from "./CollapsibleLegend";

function formatValue(v: number): string {
  if (!Number.isFinite(v)) return "";
  const a = Math.abs(v);
  if (a >= 10000 || (a > 0 && a < 0.001)) return v.toExponential(2);
  return a >= 100 ? v.toFixed(1) : a >= 10 ? v.toFixed(2) : v.toFixed(3);
}

interface RasterMapLegendProps {
  mapId: string;
}

export const RasterMapLegend: React.FC<RasterMapLegendProps> = ({ mapId }) => {
  const info = useRasterLayersStore((s) => s.rasterLegendByMap[mapId] ?? null);
  const gradientCss = useColormapGradient(info?.colormapName);

  if (!info || !gradientCss) return null;

  const widthPx = RASTER_LEGEND_DEFAULT_WIDTH_PX;
  const gradientHeightPx = RASTER_LEGEND_DEFAULT_GRADIENT_HEIGHT_PX;

  return (
    <CollapsibleLegend title={info.title} icon={<TerrainIcon className={styles["legend-icon"]} />} order={0}>
      {info.units?.trim() ? (
        <span className={styles["raster-legend__units"]}>{info.units.trim()}</span>
      ) : null}
      <div className={styles["raster-legend__row"]} style={{ width: widthPx }}>
        <div
          className={styles["raster-legend__gradient"]}
          style={{ background: gradientCss, height: gradientHeightPx }}
          aria-hidden
        />
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
    </CollapsibleLegend>
  );
};
