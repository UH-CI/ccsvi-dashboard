import React, { createContext, useState } from "react";
import styles from "./MapLegend.module.scss";

export const LegendPanelSlot = createContext<Element | null>(null);

export const LegendContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [panelsEl, setPanelsEl] = useState<HTMLDivElement | null>(null);

  return (
    <div className={styles.legendContainer}>
      <LegendPanelSlot.Provider value={panelsEl}>
        <div className={styles.legendIcons}>{children}</div>
      </LegendPanelSlot.Provider>
      <div ref={setPanelsEl} className={styles.legendPanels} />
    </div>
  );
};