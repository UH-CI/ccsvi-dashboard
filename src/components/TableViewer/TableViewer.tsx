import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Paper,
  Typography,
  Box,
  Collapse,
  CircularProgress,
  Alert,
  IconButton,
  Chip,
} from "@mui/material";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import {
  KeyboardArrowUp,
  KeyboardArrowDown,
  Fullscreen,
  FullscreenExit,
} from "@mui/icons-material";
import { loadAndParseCSV, ParsedCSVData } from "../../utils/csvParser";
import { useTableResize } from "../../hooks/useTableResize";
import { useMapStore, usePrimaryMapState } from "../../stores";
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
}

const PLACEHOLDER_VALUES = new Set(["", "—", "-", "**", "N/A", "n/a", "x", "null", "NULL", "na"]);

const detectColumnType = (columnData: string[]): "number" | "string" => {
  const realValues = columnData.filter((val) => !PLACEHOLDER_VALUES.has(val.trim()));
  if (realValues.length === 0) return "string";
  const allNumeric = realValues.every((val) => !isNaN(Number(val.replace(/[,$%]/g, ""))));
  return allNumeric ? "number" : "string";
};

const cleanHeaderForDisplay = (header: string): string => {
  return header.replace(/!!/g, " → ").trim();
};

const calculateColumnWidth = (header: string): number => {
  const cleanedHeader = cleanHeaderForDisplay(header);
  const baseWidth = cleanedHeader.length * 6;
  const minWidth = 150;
  const maxWidth = 400;
  return Math.min(Math.max(baseWidth, minWidth), maxWidth);
};

export const TableViewer: React.FC<TableViewerProps> = ({
  activeDataset,
  datasetInfo,
  onSizeChange,
  initialCollapsed = false,
}) => {
  const primaryMapId = useMapStore((state) => state.primaryMapId);
  const { metric: primaryMapMetric } = usePrimaryMapState();
  const updateMapActiveFeature = useMapStore((state) => state.updateMapActiveFeature);

  const [tableData, setTableData] = useState<ParsedCSVData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { isCollapsed, isFullHeight, toggleCollapse, toggleFullHeight } = useTableResize({
    onSizeChange,
    initialCollapsed,
  });

  useEffect(() => {
    const loadCsvData = async () => {
      if (!activeDataset) {
        setTableData(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const csvData = await loadAndParseCSV(`./data/vulnerability_datasets/${activeDataset}.csv`);
        setTableData(csvData);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to load data";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadCsvData();
  }, [activeDataset]);

  // Convert CSV data to DataGrid format
  const { columns, rows, geoidColIndex } = useMemo(() => {
    if (!tableData) return { columns: [], rows: [], geoidColIndex: -1 };

    const columnTypes = tableData.headers.map((_: string, index: number) => {
      const columnData = tableData.rows.map((row: string[]) => row[index] || "");
      return detectColumnType(columnData);
    });

    const cols: GridColDef[] = tableData.headers.map((header: string, index: number) => {
      const displayHeader = cleanHeaderForDisplay(header);
      const columnWidth = calculateColumnWidth(header);

      return {
        field: `col_${index}`,
        headerName: displayHeader,
        type: columnTypes[index],
        flex: 1,
        minWidth: columnWidth,
        resizable: true,
        sortable: true,
        filterable: true,
        hideable: true, // Allow columns to be hidden via toolbar
        renderHeader: () => (
          <div title={displayHeader} className={styles["custom-header"]}>
            {displayHeader}
          </div>
        ),
        valueFormatter:
          columnTypes[index] === "number"
            ? (value: unknown) => {
                if (value === null || value === undefined || value === "—") return "—";
                const num = parseFloat(String(value).replace(/[,$%]/g, ""));
                if (isNaN(num)) return String(value);
                // Locale formatting rounds decimals inconsistently with stored precision.
                // Use toLocaleString for integers (comma formatting), fixed decimals otherwise.
                // return num.toLocaleString();
                return Number.isInteger(num) ? num.toLocaleString() : num.toFixed(4);
              }
            : undefined,
        // Override quick filter to use substring matching for all columns.
        // MUI's default does exact equality for numbers and prefix matching for strings.
        getApplyQuickFilterFn: (filterValue: string) => {
          if (filterValue == null || filterValue === "") return null;
          const search = String(filterValue).toLowerCase();
          return (cellValue: unknown) => {
            if (cellValue == null) return false;
            return String(cellValue).toLowerCase().includes(search);
          };
        },
      };
    });

    const rowData = tableData.rows.map((row: string[], index: number) => {
      const rowObj: Record<string, string | number> = { id: index };
      row.forEach((cell: string, cellIndex: number) => {
        if (columnTypes[cellIndex] === "number" && cell && !PLACEHOLDER_VALUES.has(cell.trim())) {
          const num = parseFloat(cell.replace(/[,$%]/g, ""));
          const rounded = Number.isInteger(num) ? num : Math.round(num * 1e4) / 1e4;
          rowObj[`col_${cellIndex}`] = isNaN(num) ? cell || "—" : rounded;
        } else {
          rowObj[`col_${cellIndex}`] = cell || "—";
        }
      });
      return rowObj;
    });

    const geoidColIndex = tableData.headers.findIndex(
      (h: string) => h.trim().toLowerCase() === "geography",
    );

    return { columns: cols, rows: rowData, geoidColIndex };
  }, [tableData]);

  const handleRowClick = useCallback(
    (params: { row: Record<string, unknown> }) => {
      if (geoidColIndex < 0) return;
      const rawGeoid = String(params.row[`col_${geoidColIndex}`] ?? "");
      // Census full GEOIDs look like "1500000US150010201001" or "2500000US5003".
      // Strip the numeric prefix + "US" to get the bare geoid used by the map layers.
      const geoid = rawGeoid.replace(/^\d+US/i, "");
      if (geoid) updateMapActiveFeature(primaryMapId, { geoid, lat: 0, lng: 0, zoom: 0 });
    },
    [geoidColIndex, primaryMapId, updateMapActiveFeature],
  );

  const datasetLabel = useMemo(() => {
    if (!datasetInfo || !activeDataset) return activeDataset;
    return datasetInfo.metricLabel || activeDataset.replace(/_/g, " ").toUpperCase();
  }, [activeDataset, datasetInfo]);

  // Calculate content height for proper scrolling
  const contentHeight = isCollapsed
    ? 0
    : isFullHeight
      ? "calc(100% - 3.125rem)"
      : "calc(40vh - 3.125rem)";

  if (!activeDataset) {
    return null;
  }

  return (
    <Paper
      elevation={3}
      className={`${styles["table-viewer"]} ${isFullHeight ? styles["table-viewer--full"] : isCollapsed ? styles["table-viewer--collapsed"] : styles["table-viewer--expanded"]}`}
    >
      <Box
        className={`${styles.header} ${isCollapsed && !isFullHeight ? styles["header--collapsed"] : styles["header--expanded"]}`}
        sx={{ backgroundColor: "primary.main" }}
      >
        <Box className={styles["header-content"]}>
          <Typography variant="h6" component="div" className={styles.title}>
            Dataset: {datasetLabel}
          </Typography>
          {!isCollapsed && rows.length > 0 && (
            <Chip label={`${rows.length} rows`} size="small" className={styles.chip} />
          )}
        </Box>

        <Box className={styles["header-actions"]}>
          <IconButton
            size="small"
            onClick={toggleFullHeight}
            className={styles["toggle-button"]}
            sx={{ color: "white" }}
            title={isFullHeight ? "Restore table" : "Expand to full height"}
          >
            {isFullHeight ? <FullscreenExit /> : <Fullscreen />}
          </IconButton>
          <IconButton
            size="small"
            onClick={toggleCollapse}
            className={styles["toggle-button"]}
            sx={{ color: "white" }}
            title={isCollapsed ? "Expand table" : "Collapse table"}
          >
            {isCollapsed ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </IconButton>
        </Box>
      </Box>

      {/* Using Collapse with timeout to sync with CSS transition */}
      <Collapse
        in={!isCollapsed}
        timeout={300} // Match the CSS transition duration
        unmountOnExit={false} // Keep content mounted to prevent layout shift
      >
        <Box
          className={styles.content}
          sx={{
            height: contentHeight, // Explicit height for scrolling
            overflow: "hidden", // Establish scrolling context
          }}
        >
          {loading && (
            <Box className={styles["loading-container"]}>
              <CircularProgress />
            </Box>
          )}

          {error && (
            <Alert severity="error" className={styles["error-alert"]}>
              {error}
            </Alert>
          )}

          {tableData && !loading && !error && (
            <Box className={styles["data-grid-container"]}>
              <DataGrid
                rows={rows}
                columns={columns}
                showToolbar // Modern way to enable toolbar
                slotProps={{
                  toolbar: {
                    csvOptions: {
                      fileName: `${activeDataset}_export`,
                      delimiter: ",",
                      utf8WithBom: true,
                    },
                    printOptions: {
                      hideFooter: true,
                      hideToolbar: true,
                    },
                    quickFilterProps: {
                      // Treat the entire search input as one term instead of
                      // splitting by spaces. Splitting causes short tokens
                      // like "1" to match every row via numeric columns.
                      quickFilterParser: (input: string) => [input],
                    },
                  },
                }}
                initialState={{
                  pagination: {
                    paginationModel: { pageSize: 25 },
                  },
                }}
                pageSizeOptions={[10, 25, 50, 100]}
                onRowClick={geoidColIndex >= 0 && !!primaryMapMetric ? handleRowClick : undefined}
                density="compact"
                hideFooter={false}
                // Enable column management
                disableColumnMenu={false}
                disableColumnFilter={false}
                disableColumnSelector={false}
                disableDensitySelector={false}
                // CRITICAL: All DataGrid styling moved to sx prop to avoid conflicts
                sx={{
                  height: "100%",
                  width: "100%",
                  border: "none",

                  // Toolbar styling
                  "& .MuiDataGrid-toolbarContainer": {
                    padding: "8px 16px",
                    borderBottom: "1px solid #e0e0e0",
                    backgroundColor: "#f9f9f9",
                    flexWrap: "wrap",
                    gap: "8px",
                    "& .MuiButton-root": {
                      fontSize: "0.75rem",
                      padding: "4px 8px",
                      minWidth: "auto",
                    },
                  },

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
                    minHeight: "100px !important",
                    maxHeight: "120px !important",
                  },

                  "& .MuiDataGrid-columnHeader": {
                    backgroundColor: "#f5f5f5",
                    padding: "4px 4px !important",
                    height: "auto !important",
                    minHeight: "100px !important",

                    "& .MuiDataGrid-columnHeaderTitle": {
                      whiteSpace: "normal !important",
                      lineHeight: "1.3 !important",
                      fontWeight: "bold !important",
                      fontSize: "0.75rem !important",
                      overflow: "visible !important",
                      textOverflow: "unset !important",
                      wordBreak: "break-word !important",
                      hyphens: "auto",
                      height: "auto !important",
                    },

                    "& .MuiDataGrid-columnHeaderTitleContainer": {
                      height: "100% !important",
                      flexDirection: "column !important",
                      justifyContent: "center !important",
                      alignItems: "center !important",
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
                }}
              />
            </Box>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
};
