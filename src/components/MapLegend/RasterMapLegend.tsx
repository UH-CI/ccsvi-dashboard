import React, { useEffect, useState } from "react";
import TerrainIcon from "@mui/icons-material/Terrain";
import { useRasterLayersStore } from "../../stores";
// DEPRECATED — ColorGeneratorService drove the monochromaticRainfall color scale used in the
// old ArrayBuffer decode → GridLayer render pipeline. Replaced by the TiTiler native colormap
// endpoint (/api/v1/rasters/colormap). Pending deletion.
//
// import { ColorGeneratorService } from "../RasterLayers/color-generator.service";
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

// DEPRECATED — buildGradientCss used ColorGeneratorService (monochromaticRainfall scale) to
// build the legend gradient. Replaced by colormapToCss below. Pending deletion.
//
// function buildGradientCss(info: RasterLegendInfo): string {
//   const gen = new ColorGeneratorService();
//   const scale = gen.getDefaultMonochromaticRainfallColorScale([info.min, info.max], false);
//   const hexes = scale.getColorsHex();
//   const n = hexes.length;
//   const step = Math.max(1, Math.floor(n / 16));
//   const sampled = hexes.filter((_, i) => i % step === 0 || i === n - 1);
//   const stops = sampled
//     .map((hex, i) => `${hex} ${(i / Math.max(1, sampled.length - 1)) * 100}%`)
//     .join(", ");
//   return `linear-gradient(to top, ${stops})`;
// }

// Session-level gradient cache — avoids re-fetching the same colormap within a tab.
const colormapGradientCache = new Map<string, string>();

async function colormapToCss(name: string): Promise<string> {
  if (colormapGradientCache.has(name)) return colormapGradientCache.get(name)!;
  const res = await fetch(`/api/v1/rasters/colormap?name=${encodeURIComponent(name)}`);
  if (!res.ok) throw new Error(`colormap fetch failed: ${res.status}`);
  const entries: [number, number, number, number][] = await res.json();
  const step = Math.max(1, Math.floor(entries.length / 16));
  const sampled = entries.filter((_, i) => i % step === 0 || i === entries.length - 1);
  const stops = sampled
    .map(([r, g, b, a], i) => {
      const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}${Math.round(a).toString(16).padStart(2, "0")}`;
      return `${hex} ${(i / Math.max(1, sampled.length - 1)) * 100}%`;
    })
    .join(", ");
  const css = `linear-gradient(to top, ${stops})`;
  colormapGradientCache.set(name, css);
  return css;
}

interface RasterMapLegendProps {
  mapId: string;
}

export const RasterMapLegend: React.FC<RasterMapLegendProps> = ({ mapId }) => {
  const info = useRasterLayersStore((s) => s.rasterLegendByMap[mapId] ?? null);

  const [gradientCss, setGradientCss] = useState<string | null>(null);

  useEffect(() => {
    if (!info?.colormapName) { setGradientCss(null); return; }
    colormapToCss(info.colormapName).then(setGradientCss).catch(() => setGradientCss(null));
  }, [info?.colormapName]);

  if (!info || !gradientCss) return null;

  const widthPx = RASTER_LEGEND_DEFAULT_WIDTH_PX;
  const gradientHeightPx = RASTER_LEGEND_DEFAULT_GRADIENT_HEIGHT_PX;

  return (
    <CollapsibleLegend title={info.title} icon={<TerrainIcon className={styles["legend-icon"]} />} order={0}>
      <div className={styles["raster-legend__row"]} style={{ width: widthPx }}>
        <div
          className={styles["raster-legend__gradient"]}
          style={{ background: gradientCss, height: gradientHeightPx }}
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
    </CollapsibleLegend>
  );
};
