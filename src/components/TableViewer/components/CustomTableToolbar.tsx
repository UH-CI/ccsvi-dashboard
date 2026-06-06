import React from "react";
import { Typography, Box, IconButton, Chip, Divider, Button, useTheme } from "@mui/material";
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
}) => {
  const theme = useTheme();

  return (
    <Toolbar
      render={(props) => (
        <Box
          {...props}
          sx={{
            display: "flex",
            backgroundColor: theme.palette.primary.main,
            color: "white",
            px: 1,
            py: 0.5,
            gap: "4px",
            alignItems: "center",
            flexWrap: "wrap",
            "& .MuiButton-root": { color: "white", fontSize: "0.75rem", px: 0.75 },
          }}
        />
      )}
    >
      <Typography
        variant="subtitle2"
        sx={{ fontWeight: 600, color: "white", whiteSpace: "nowrap", mr: 0.5 }}
      >
        {datasetLabel}
      </Typography>
      <Chip label={`${rowCount} rows`} size="small" className={styles.chip} />
      <Box sx={{ flex: 1 }} />
      <ColumnsPanelTrigger
        size="small"
        startIcon={<ViewColumn sx={{ fontSize: "1rem !important" }} />}
      >
        Columns
      </ColumnsPanelTrigger>
      <FilterPanelTrigger
        size="small"
        startIcon={<FilterList sx={{ fontSize: "1rem !important" }} />}
      >
        Filters
      </FilterPanelTrigger>
      <ExportCsv
        size="small"
        startIcon={<SaveAlt sx={{ fontSize: "1rem !important" }} />}
        options={{ fileName: `${activeDataset}_export`, delimiter: ",", utf8WithBom: true }}
      >
        Export CSV
      </ExportCsv>
      <QuickFilter parser={(v) => (v.trim() ? [v] : [])}>
        <QuickFilterTrigger
          render={(props, state) => (
            <Button
              size="small"
              startIcon={<Search sx={{ fontSize: "1rem !important" }} />}
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
              sx={{
                display: state.expanded ? "flex" : "none",
                alignItems: "center",
                border: "1px solid rgba(255,255,255,0.4)",
                borderRadius: "4px",
                px: 0.75,
              }}
            >
              <Search sx={{ color: "white", fontSize: "1rem", mr: 0.5 }} />
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
        sx={{ borderColor: "rgba(255,255,255,0.3)", mx: 0.5 }}
      />
      <IconButton
        size="small"
        onClick={toggleFullHeight}
        sx={{ color: "white" }}
        title={isFullHeight ? "Restore table" : "Expand to full height"}
      >
        {isFullHeight ? <FullscreenExit /> : <Fullscreen />}
      </IconButton>
      <IconButton
        size="small"
        onClick={toggleCollapse}
        sx={{ color: "white" }}
        title="Collapse table"
      >
        <KeyboardArrowDown />
      </IconButton>
    </Toolbar>
  );
};
