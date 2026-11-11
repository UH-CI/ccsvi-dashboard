import React, { useCallback, useContext, useState } from "react";
import { createPortal } from "react-dom";
import LegendToggleIcon from "@mui/icons-material/LegendToggle";
import { Tooltip } from "@mui/material";
import { LegendPanelSlot } from "./LegendContainer";
import styles from "./CollapsibleLegend.module.scss";

interface CollapsibleLegendProps {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  open?: boolean;
  onToggle?: () => void;
  order?: number;
}

export const CollapsibleLegend: React.FC<CollapsibleLegendProps> = ({
  title,
  icon,
  children,
  open: controlledOpen,
  onToggle,
  order,
}) => {
  const [internalOpen, setInternalOpen] = useState(true);
  const isOpen = controlledOpen ?? internalOpen;
  const panelSlot = useContext(LegendPanelSlot);
  const toggle = useCallback(
    () => (onToggle ? onToggle() : setInternalOpen((v) => !v)),
    [onToggle],
  );

  const panel = isOpen ? (
    <div className={styles.panel} style={order !== undefined ? { order } : undefined}>
      <Tooltip title={title} placement="top">
        <span className={styles["header-label"]}>{title}</span>
      </Tooltip>
      {children}
    </div>
  ) : null;

  return (
    <>
      <button
        className={`${styles["icon-button"]} ${isOpen ? styles["icon-button--active"] : ""}`}
        onClick={toggle}
      >
        {icon ?? <LegendToggleIcon className={styles["icon-button-icon"]} />}
      </button>
      {panel && panelSlot ? createPortal(panel, panelSlot) : panel}
    </>
  );
};