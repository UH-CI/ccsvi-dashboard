import React from "react";
import { DataAnalyzerMenu } from "../../DataAnalyzerMenu/DataAnalyzerMenu";
import { MenuShell } from "./MenuShell";
import styles from "../ControlPanel.module.scss";

interface AnalyzerMenuProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  onInfoClick: (e: React.MouseEvent<HTMLElement>) => void;
}

export const AnalyzerMenu: React.FC<AnalyzerMenuProps> = ({
  open,
  anchorEl,
  onClose,
  onInfoClick,
}) => {
  return (
    <MenuShell
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      title="Data Analyzer"
      onInfoClick={onInfoClick}
      paperClassName={styles["menu-paper-wide"]}
      variant="panel"
    >
      <DataAnalyzerMenu />
    </MenuShell>
  );
};
