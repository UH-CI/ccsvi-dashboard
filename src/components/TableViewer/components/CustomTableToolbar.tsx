import React from "react";
import { Typography, Box, IconButton, Chip, Divider, Button } from "@mui/material";
import {
  Toolbar,
  ColumnsPanelTrigger,
  FilterPanelTrigger,
  ExportCsv,
  QuickFilter,
  QuickFilterTrigger,
  QuickFilterControl,
} from "@mui/x-data-grid";
import {
  KeyboardArrowDown,
  Fullscreen,
  FullscreenExit,
  Search,
  ViewColumn,
  FilterList,
  SaveAlt,
} from "@mui/icons-material";
import styles from "../TableViewer.module.scss";

interface CustomToolbarProps {
  datasetLabel: string;
  rowCount: number;
  isFullHeight: boolean;
  activeDataset: string;
  toggleCollapse: () => void;
  toggleFullHeight: () => void;
}

declare module "@mui/x-data-grid" {
  interface ToolbarPropsOverrides {
    datasetLabel: string;
    rowCount: number;
    isFullHeight: boolean;
    activeDataset: string;
    toggleCollapse: () => void;
    toggleFullHeight: () => void;
  }
}

export const CustomTableToolbar: React.FC<CustomToolbarProps> = ({
  datasetLabel,
  rowCount,
  isFullHeight,
  activeDataset,
  toggleCollapse,
  toggleFullHeight,
}) => (
  <Toolbar
    render={(props) => (
      <Box
        {...props}
        className={`${props.className ?? ""} ${styles["toolbar-bar"]}`}
      />
    )}
  >
    <Typography variant="subtitle2" className={styles["toolbar-title"]}>
      {datasetLabel}
    </Typography>
    <Chip label={`${rowCount} rows`} size="small" className={styles.chip} />
    <Box className={styles["toolbar-spacer"]} />
    <ColumnsPanelTrigger
      size="small"
      startIcon={<ViewColumn className={styles["toolbar-icon"]} />}
    >
      Columns
    </ColumnsPanelTrigger>
    <FilterPanelTrigger
      size="small"
      startIcon={<FilterList className={styles["toolbar-icon"]} />}
    >
      Filters
    </FilterPanelTrigger>
    <ExportCsv
      size="small"
      startIcon={<SaveAlt className={styles["toolbar-icon"]} />}
      options={{ fileName: `${activeDataset}_export`, delimiter: ",", utf8WithBom: true }}
    >
      Export CSV
    </ExportCsv>
    <QuickFilter parser={(v) => (v.trim() ? [v] : [])}>
      <QuickFilterTrigger
        render={(props, state) => (
          <Button
            size="small"
            startIcon={<Search className={styles["toolbar-icon"]} />}
            {...props}
            sx={{ display: state.expanded ? "none" : undefined }}
          >
            Search
          </Button>
        )}
      />
      <QuickFilterControl
        render={(props, state) => (
          <Box
            className={styles["toolbar-search-box"]}
            sx={{ display: state.expanded ? "flex" : "none" }}
          >
            <Search className={styles["toolbar-search-icon"]} />
            <input
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ref={props.ref as any}
              value={(props.value as string) ?? ""}
              onChange={props.onChange as React.ChangeEventHandler<HTMLInputElement>}
              onKeyDown={props.onKeyDown as React.KeyboardEventHandler<HTMLInputElement>}
              placeholder="Search..."
              style={{
                color: "white",
                background: "transparent",
                border: "none",
                outline: "none",
                fontSize: "0.75rem",
                width: "120px",
                caretColor: "white",
                padding: "3px 0",
              }}
            />
          </Box>
        )}
      />
    </QuickFilter>
    <Divider
      orientation="vertical"
      flexItem
      className={styles["toolbar-divider"]}
    />
    <IconButton
      size="small"
      onClick={toggleFullHeight}
      className={styles["toolbar-icon-btn"]}
      title={isFullHeight ? "Restore table" : "Expand to full height"}
    >
      {isFullHeight ? <FullscreenExit /> : <Fullscreen />}
    </IconButton>
    <IconButton
      size="small"
      onClick={toggleCollapse}
      className={styles["toolbar-icon-btn"]}
      title="Collapse table"
    >
      <KeyboardArrowDown />
    </IconButton>
  </Toolbar>
);
