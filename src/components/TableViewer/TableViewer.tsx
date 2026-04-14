import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Paper,
  Typography,
  Box,
  Collapse,
  Alert,
  IconButton,
  Chip,
  Divider,
  Button,
} from "@mui/material";
import {
  DataGrid,
  GridColDef,
  GridToolbarContainer,
  GridToolbarColumnsButton,
  GridToolbarFilterButton,
  GridToolbarDensitySelector,
  GridToolbarExport,
  useGridApiContext,
} from "@mui/x-data-grid";
import {
  KeyboardArrowUp,
  KeyboardArrowDown,
  Fullscreen,
  FullscreenExit,
  Search,
} from "@mui/icons-material";
import { loadAndParseCSV, ParsedCSVData } from "../../utils/csvParser";
import { useTableResize } from "../../hooks/useTableResize";
import { useTheme } from "@mui/material";
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

interface CustomToolbarProps {
  datasetLabel: string;
  rowCount: number;
  isFullHeight: boolean;
  activeDataset: string;
  toggleCollapse: () => void;
  toggleFullHeight: () => void;
}

const CustomTableToolbar: React.FC<CustomToolbarProps> = ({
  datasetLabel,
  rowCount,
  isFullHeight,
  activeDataset,
  toggleCollapse,
  toggleFullHeight,
}) => {
  const theme = useTheme();
  const apiRef = useGridApiContext();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (apiRef.current as any).setQuickFilterValues(value ? [value] : []);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchValue("");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (apiRef.current as any).setQuickFilterValues([]);
  };

  return (
  <GridToolbarContainer
    sx={{
      backgroundColor: theme.palette.primary.main,
      color: "white",
      px: 1,
      py: 0.5,
      gap: "4px",
      alignItems: "center",
      flexWrap: "wrap",
      "& .MuiButton-root": { color: "white", fontSize: "0.75rem", px: 0.75 },
    }}
  >
    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "white", whiteSpace: "nowrap", mr: 0.5 }}>
      {datasetLabel}
    </Typography>
    <Chip label={`${rowCount} rows`} size="small" className={styles.chip} />
    <Box sx={{ flex: 1 }} />
    <GridToolbarColumnsButton />
    <GridToolbarFilterButton />
    <GridToolbarDensitySelector />
    <GridToolbarExport
      csvOptions={{ fileName: `${activeDataset}_export`, delimiter: ",", utf8WithBom: true }}
      printOptions={{ hideFooter: true, hideToolbar: true }}
    />
    {searchOpen ? (
      <Box sx={{ display: "flex", alignItems: "center", border: "1px solid rgba(255,255,255,0.4)", borderRadius: "4px", px: 0.75 }}>
        <Search sx={{ color: "white", fontSize: "1rem", mr: 0.5 }} />
        <input
          autoFocus
          value={searchValue}
          onChange={(e) => handleSearchChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Escape") closeSearch(); }}
          placeholder="Search..."
          style={{ color: "white", background: "transparent", border: "none", outline: "none", fontSize: "0.75rem", width: "120px", caretColor: "white", padding: "3px 0" }}
        />
      </Box>
    ) : (
      <Button size="small" startIcon={<Search sx={{ fontSize: "1rem !important" }} />} onClick={() => setSearchOpen(true)}>
        Search
      </Button>
    )}
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
    <IconButton size="small" onClick={toggleCollapse} sx={{ color: "white" }} title="Collapse table">
      <KeyboardArrowDown />
    </IconButton>
  </GridToolbarContainer>
  );
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

  const contentHeight = isFullHeight ? "100%" : "40vh";

  if (!activeDataset) {
    return null;
  }

  return (
    <Paper
      elevation={3}
      className={`${styles["table-viewer"]} ${isFullHeight ? styles["table-viewer--full"] : isCollapsed ? styles["table-viewer--collapsed"] : styles["table-viewer--expanded"]}`}
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
      >
        <Box
          className={styles.content}
          sx={{
            height: contentHeight,
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
                rows={rows}
                columns={columns}
                loading={loading}
                showToolbar
                slots={{ toolbar: CustomTableToolbar }}
                slotProps={{
                  toolbar: {
                    datasetLabel,
                    rowCount: rows.length,
                    isFullHeight,
                    activeDataset,
                    toggleCollapse,
                    toggleFullHeight,
                  } as CustomToolbarProps,
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
