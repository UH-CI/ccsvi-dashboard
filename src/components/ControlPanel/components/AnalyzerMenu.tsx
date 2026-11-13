import React from "react";
import { DataAnalyzerMenu } from "../../DataAnalyzerMenu/DataAnalyzerMenu";
import { MenuShell, type MenuProps } from "./MenuShell";
import styles from "../ControlPanel.module.scss";

// A wide panel that stays open while other menus are used
export const AnalyzerMenu: React.FC<MenuProps> = (props) => {
  return (
    <MenuShell {...props} paperClassName={styles["menu-paper-wide"]} variant="panel">
      <DataAnalyzerMenu />
    </MenuShell>
  );
};
