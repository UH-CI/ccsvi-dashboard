import React, { useEffect } from "react";
import { DataAnalyzerMenu } from "../../DataAnalyzerMenu/DataAnalyzerMenu";
import { MenuShell } from "./MenuShell";
import { useAppStore } from "../../../stores";
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
  const fetchDatasetCatalog = useAppStore((state) => state.fetchDatasetCatalog);

  useEffect(() => {
    if (open) fetchDatasetCatalog();
  }, [open, fetchDatasetCatalog]);

  return (
    <MenuShell
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      title="Data Analyzer"
      onInfoClick={onInfoClick}
      paperClassName={styles["menu-paper-wide"]}
    >
      <DataAnalyzerMenu />
    </MenuShell>
  );
};
