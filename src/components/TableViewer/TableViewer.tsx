import { useState, useEffect, useMemo } from "react";
import { Paper, Typography, Box, Collapse, Alert, IconButton } from "@mui/material";
import { DataGrid, useGridApiRef } from "@mui/x-data-grid";
import { KeyboardArrowUp } from "@mui/icons-material";
import { ParsedCSVData } from "../../utils/csvParser";
import { getDatasetTable } from "../../api/client";
import { useTableResize } from "../../hooks/useTableResize";
import { usePrimaryMapState, useFilterStore } from "../../stores";
import { CustomTableToolbar } from "./components/CustomTableToolbar";
import { useDataGridColumns } from "./hooks/useDataGridColumns";
import { useActiveRowSync } from "./hooks/useActiveRowSync";
import styles from "./TableViewer.module.scss";

interface DatasetInfo {
  metricName?: string;
  metricLabel?: string;
  hawaiianHomelands?: boolean;
  columnThresholds?: Record<string, unknown>;
}

interface TableViewerProps {
  activeDataset: string;
  datasetInfo: DatasetInfo | null;
  onSizeChange?: (isCollapsed: boolean) => void;
  initialCollapsed?: boolean;
  tableHeight?: number | null;
  collapsed?: boolean;
  fullscreen?: boolean;
}

export const TableViewer: React.FC<TableViewerProps> = ({
  activeDataset,
  datasetInfo,
  onSizeChange,
  initialCollapsed = false,
  tableHeight,
  collapsed,
  fullscreen,
}) => {
  const { metric: primaryMapMetric } = usePrimaryMapState();
  const filterResults = useFilterStore((s) => s.results);
  const filteredGeoidsSet = useMemo(
    () => (filterResults ? new Set(filterResults.map((r) => r.geoid)) : null),
    [filterResults],
  );

  const [tableData, setTableData] = useState<ParsedCSVData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });

  const apiRef = useGridApiRef();

  const {
    isCollapsed,
    isFullHeight,
    toggleCollapse,
    toggleFullHeight,
    setCollapsed,
    setFullHeight,
  } = useTableResize({
    onSizeChange,
    initialCollapsed,
  });

  useEffect(() => {
    if (collapsed !== undefined) setCollapsed(collapsed);
  }, [collapsed, setCollapsed]);

  useEffect(() => {
    if (fullscreen !== undefined) setFullHeight(fullscreen);
  }, [fullscreen, setFullHeight]);

  useEffect(() => {
    const loadCsvData = async () => {
      if (!activeDataset) {
        setTableData(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const data = await getDatasetTable(activeDataset);
        const headers = data.length > 0 ? Object.keys(data[0]) : [];
        const rows = data.map((row) => headers.map((h) => String(row[h] ?? "")));
        setTableData({ headers, rows });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load data";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadCsvData();
  }, [activeDataset]);

  const { columns, rows, geoidColIndex } = useDataGridColumns(tableData);

  const displayRows = useMemo(() => {
    if (!filteredGeoidsSet || geoidColIndex < 0) return rows;
    return rows.filter((row) => {
      const raw = String(row[`col_${geoidColIndex}`] ?? "");
      const geoid = raw.replace(/^\d+US/i, "");
      return filteredGeoidsSet.has(geoid);
    });
  }, [rows, filteredGeoidsSet, geoidColIndex]);

  const { activeRowId, handleRowClick } = useActiveRowSync({
    apiRef,
    rows,
    geoidColIndex,
    paginationModel,
    setPaginationModel,
    setCollapsed,
  });

  const datasetLabel = useMemo(() => {
    if (!datasetInfo || !activeDataset) return activeDataset;
    return datasetInfo.metricLabel || activeDataset.replace(/_/g, " ").toUpperCase();
  }, [activeDataset, datasetInfo]);

  if (!activeDataset) {
    return null;
  }

  return (
    <Paper
      elevation={3}
      className={`${styles["table-viewer"]} ${isFullHeight ? styles["table-viewer--full"] : isCollapsed ? styles["table-viewer--collapsed"] : styles["table-viewer--expanded"]}`}
      style={
        !isCollapsed && !isFullHeight && tableHeight
          ? { height: tableHeight, maxHeight: "none", flex: "none" }
          : undefined
      }
    >
      {isCollapsed && (
        <Box
          className={styles.header}
          sx={{ backgroundColor: "primary.main", cursor: "pointer" }}
          onClick={toggleCollapse}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "white" }}>
            {datasetLabel}
          </Typography>
          <IconButton size="small" sx={{ color: "white" }} title="Expand table">
            <KeyboardArrowUp />
          </IconButton>
        </Box>
      )}

      <Collapse
        in={!isCollapsed}
        timeout={300}
        unmountOnExit={false}
        sx={{
          flex: 1,
          minHeight: 0,
          "& .MuiCollapse-wrapper": { height: "100%" },
          "& .MuiCollapse-wrapperInner": { height: "100%" },
        }}
      >
        <Box
          className={styles.content}
          sx={{
            height: "100%",
            overflow: "hidden",
          }}
        >
          {error && (
            <Alert severity="error" className={styles["error-alert"]}>
              {error}
            </Alert>
          )}

          {!error && (
            <Box className={styles["data-grid-container"]}>
              <DataGrid
                apiRef={apiRef}
                rows={displayRows}
                columns={columns}
                loading={loading}
                showToolbar
                density="compact"
                slots={{ toolbar: CustomTableToolbar }}
                slotProps={{
                  toolbar: {
                    datasetLabel,
                    rowCount: displayRows.length,
                    isFullHeight,
                    activeDataset,
                    toggleCollapse,
                    toggleFullHeight,
                  },
                }}
                paginationModel={paginationModel}
                onPaginationModelChange={setPaginationModel}
                pageSizeOptions={[10, 25, 50, 100]}
                getRowClassName={(params) =>
                  params.row.id === activeRowId ? styles["active-row"] : ""
                }
                onRowClick={geoidColIndex >= 0 && !!primaryMapMetric ? handleRowClick : undefined}
                hideFooter={false}
                disableColumnMenu={false}
                disableColumnFilter={false}
                disableColumnSelector={false}
                sx={{
                  height: "100%",
                  width: "100%",
                  border: "none",

                  // Main container - allow scrolling
                  "& .MuiDataGrid-main": {
                    overflow: "hidden",
                  },

                  // Virtual scroller - enable scrollbars
                  "& .MuiDataGrid-virtualScroller": {
                    overflow: "auto !important",
                  },

                  // Column headers styling
                  "& .MuiDataGrid-columnHeaders": {
                    backgroundColor: "#f5f5f5",
                    borderBottom: "1px solid #e0e0e0",
                    minHeight: "60px !important",
                    maxHeight: "80px !important",
                  },

                  "& .MuiDataGrid-columnHeaderDraggableContainer": {
                    flexDirection: "row !important",
                  },

                  "& .MuiDataGrid-columnHeader": {
                    backgroundColor: "#f5f5f5",
                    padding: "2px 4px !important",
                    height: "auto !important",
                    minHeight: "60px !important",
                    maxHeight: "80px !important",

                    "& .MuiDataGrid-columnHeaderTitle": {
                      whiteSpace: "normal !important",
                      lineHeight: "1.2 !important",
                      fontWeight: "bold !important",
                      fontSize: "0.75rem !important",
                      overflow: "hidden !important",
                      textOverflow: "ellipsis",
                      wordBreak: "normal !important",
                      overflowWrap: "break-word",
                      hyphens: "auto",
                      display: "-webkit-box",
                      WebkitLineClamp: 4,
                      WebkitBoxOrient: "vertical",
                    },

                    "& .MuiDataGrid-columnHeaderTitleContainer": {
                      height: "100% !important",
                      flexDirection: "row !important",
                      justifyContent: "space-between !important",
                      alignItems: "center !important",
                      gap: "2px",
                    },

                    "& .MuiDataGrid-columnHeaderTitleContainerContent": {
                      flex: "1 1 auto",
                      minWidth: 0,
                      overflow: "hidden",
                    },

                    "& .MuiDataGrid-iconButtonContainer": {
                      flex: "0 0 auto",
                      width: "auto !important",
                      visibility: "visible",
                      marginLeft: "2px",
                    },
                  },

                  // Header borders
                  "& .MuiDataGrid-columnHeader--withRightBorder": {
                    borderRight: "1px solid #e0e0e0",
                  },

                  // Footer styling
                  "& .MuiDataGrid-footerContainer": {
                    borderTop: "1px solid #e0e0e0",
                    backgroundColor: "#f5f5f5",
                    flexShrink: 0,
                  },

                  // Row styling
                  "& .MuiDataGrid-row:hover": {
                    backgroundColor: "rgba(0, 0, 0, 0.04)",
                  },
                  "& .MuiDataGrid-cell:focus, & .MuiDataGrid-cell:focus-within": {
                    outline: "none",
                  },
                  ...(geoidColIndex >= 0 &&
                    !!primaryMapMetric && {
                      "& .MuiDataGrid-row": { cursor: "pointer" },
                    }),

                  "& .MuiDataGrid-row:nth-of-type(odd)": {
                    backgroundColor: "#fafafa",
                  },
                  [`& .MuiDataGrid-row.${styles["active-row"]}`]: {
                    backgroundColor: "rgba(25, 118, 210, 0.15)",
                  },
                  [`& .MuiDataGrid-row.${styles["active-row"]}:hover`]: {
                    backgroundColor: "rgba(25, 118, 210, 0.22)",
                  },
                }}
              />
            </Box>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
};
