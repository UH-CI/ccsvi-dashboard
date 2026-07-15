import React from "react";
import { DataAnalyzerMenu } from "../../DataAnalyzerMenu/DataAnalyzerMenu";
import { MenuShell } from "./MenuShell";

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
}) => (
  <MenuShell
    open={open}
    anchorEl={anchorEl}
    onClose={onClose}
    title="Data Analyzer"
    onInfoClick={onInfoClick}
  >
    <DataAnalyzerMenu />
  </MenuShell>
);
