import React, { useMemo } from "react";
import { Tooltip } from "@mui/material";
import styles from "./MapLegend.module.scss";
import { ComputedBivariateColorScale } from "../../utils/colorThresholds";

interface MapLegendProps {
  limits: number[] | null;
  colors: string[] | null;
  bivariate?: ComputedBivariateColorScale;
  metric1Label?: string;
  metric2Label?: string;
}

export const MapLegend: React.FC<MapLegendProps> = ({
  limits,
  colors,
  bivariate,
  metric1Label,
  metric2Label,
}) => {
  const legendLevels = useMemo(() => {
    if (bivariate || !limits || !colors || limits.length < 2) return [];

    const items = [];
    for (let i = limits.length - 2; i >= 0; i--) {
      const label =
        i === limits.length - 2
          ? `> ${limits[i]}`
          : i === 0
            ? `≤ ${limits[i + 1]}`
            : `${limits[i]} – ${limits[i + 1]}`;
      items.push(
        <div key={i} className={styles.legend__item}>
          <div className={styles["legend__item-color"]} style={{ backgroundColor: colors[i] }} />
          <span>{label}</span>
        </div>,
      );
    }
    return items;
  }, [bivariate, limits, colors]);

  if (!bivariate && (!limits || !colors)) return null;

  return (
    <div className={styles.legend}>
      <div className={styles.legend__title}>Legend</div>
      {bivariate ? (
        <div className={styles["legend__bivariate"]}>
          <Tooltip title={metric2Label ?? ""} placement="left">
            <span className={styles["legend__bivariate-label-y"]}>
              {metric2Label ?? "Metric 2"}
            </span>
          </Tooltip>
          <div className={styles["legend__bivariate-right"]}>
            <div className={styles["legend__bivariate-grid"]}>
              {[...bivariate.palette].reverse().map((rowColors, rowIdx) => (
                <div key={rowIdx} className={styles["legend__bivariate-row"]}>
                  {rowColors.map((color, col) => (
                    <div
                      key={`${rowIdx}-${col}`}
                      className={styles["legend__bivariate-cell"]}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              ))}
            </div>
            <Tooltip title={metric1Label ?? ""} placement="bottom">
              <span className={styles["legend__bivariate-label-x"]}>
                {metric1Label ?? "Metric 1"}
              </span>
            </Tooltip>
          </div>
        </div>
      ) : (
        <div className={styles.legend__items}>{legendLevels}</div>
      )}
    </div>
  );
};
