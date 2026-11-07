import React from "react";
import { CollapsibleLegend } from "./CollapsibleLegend";
import styles from "./MapLegend.module.scss";

const WIDTH_PX = 80;
const GRADIENT_HEIGHT_PX = 100;

// More decimals for smaller numbers; very large or very small ones in exponent form
function formatValue(v: number): string {
  if (!Number.isFinite(v)) return "";
  const a = Math.abs(v);
  if (a >= 10000 || (a > 0 && a < 0.001)) return v.toExponential(2);
  return a >= 100 ? v.toFixed(1) : a >= 10 ? v.toFixed(2) : v.toFixed(3);
}

interface GradientLegendProps {
  title: string;
  icon: React.ReactNode;
  // A bottom-to-top CSS gradient
  gradient: string;
  min: number;
  max: number;
  units?: string;
}

// A colour-bar legend: the units under the title, then the bar with its max on top and min below
export const GradientLegend: React.FC<GradientLegendProps> = ({
  title,
  icon,
  gradient,
  min,
  max,
  units,
}) => {
  const unitText = units?.trim();
  const withUnits = (v: number) => (unitText ? `${formatValue(v)}\u00a0${unitText}` : undefined);

  return (
    <CollapsibleLegend title={title} icon={icon} order={0}>
      {unitText ? <span className={styles["raster-legend__units"]}>{unitText}</span> : null}
      <div className={styles["raster-legend__row"]} style={{ width: WIDTH_PX }}>
        <div
          className={styles["raster-legend__gradient"]}
          style={{ background: gradient, height: GRADIENT_HEIGHT_PX }}
          aria-hidden
        />
        <div className={styles["raster-legend__nums"]} style={{ minHeight: GRADIENT_HEIGHT_PX }}>
          <span title={withUnits(max)}>{formatValue(max)}</span>
          <span title={withUnits(min)}>{formatValue(min)}</span>
        </div>
      </div>
    </CollapsibleLegend>
  );
};
