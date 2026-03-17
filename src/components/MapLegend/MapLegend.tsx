import React, { useMemo } from "react";
import styles from "./MapLegend.module.scss";

interface MapLegendProps {
  limits: number[] | null;
  colors: string[] | null;
}

export const MapLegend: React.FC<MapLegendProps> = ({ limits, colors }) => {
  const legendLevels = useMemo(() => {
    if (!limits || !colors || limits.length < 2) return [];

    const items = [];
    for (let i = limits.length - 2; i >= 0; i--) {
      const low = limits[i];
      const high = limits[i + 1];

      let label: string;
      if (i === limits.length - 2) {
        label = `> ${low}`;
      } else if (i === 0) {
        label = `≤ ${high}`;
      } else {
        label = `${low} – ${high}`;
      }

      items.push(
        <div key={i} className={styles.legend__item}>
          <div
            className={styles["legend__item-color"]}
            style={{ backgroundColor: colors[i] }}
          />
          <span>{label}</span>
        </div>,
      );
    }
    return items;
  }, [limits, colors]);

  if (!limits || !colors) {
    return null;
  }

  return (
    <div className={styles.legend}>
      <div className={styles.legend__title}>Map Legend</div>
      <div className={styles.legend__items}>{legendLevels}</div>
    </div>
  );
};