import React from "react";
import { Menu, Popper, Paper, Box, Typography, Tooltip, IconButton } from "@mui/material";
import { InfoOutlined } from "@mui/icons-material";
import styles from "../ControlPanel.module.scss";

interface MenuShellProps {
  open: boolean;
  anchorEl: HTMLElement | null;
  onClose: () => void;
  title: string;
  onInfoClick: (e: React.MouseEvent<HTMLElement>) => void;
  children: React.ReactNode;
  paperClassName?: string;
  // "menu" (default) closes on outside click
  // "panel" stays open on outside click
  variant?: "menu" | "panel";
}

// Shared menu chrome: the popover, content box, and title row with info button.
export const MenuShell: React.FC<MenuShellProps> = ({
  open,
  anchorEl,
  onClose,
  title,
  onInfoClick,
  children,
  paperClassName,
  variant = "menu",
}) => {
  const paperClass = [
    styles["menu-paper"],
    variant === "panel" ? styles["menu-panel-paper"] : null,
    paperClassName,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <Box className={styles["menu-content"]}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
        <Typography variant="subtitle2" className={styles["popover-title"]}>
          {title}
        </Typography>
        <Tooltip title="About this section">
          <IconButton size="small" onClick={onInfoClick} className={styles["menu-info-btn"]}>
            <InfoOutlined fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
      {children}
    </Box>
  );

  if (variant === "panel") {
    return (
      <Popper open={open} anchorEl={anchorEl} placement="bottom-start" style={{ zIndex: 1300 }}>
        <Paper className={paperClass}>{content}</Paper>
      </Popper>
    );
  }

  const menuProps = {
    anchorOrigin: { vertical: "bottom" as const, horizontal: "left" as const },
    transformOrigin: { vertical: "top" as const, horizontal: "left" as const },
    disableAutoFocus: true,
    disableEnforceFocus: true,
    disableRestoreFocus: true,
    keepMounted: false,
    PaperProps: { className: paperClass },
    MenuListProps: { className: styles["menu-list"] },
  };

  return (
    <Menu open={open} anchorEl={anchorEl} onClose={onClose} {...menuProps}>
      {content}
    </Menu>
  );
};