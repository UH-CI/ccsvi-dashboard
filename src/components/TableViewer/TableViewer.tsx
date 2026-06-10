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
        <Box className={styles.header} onClick={toggleCollapse}>
          <Typography variant="subtitle2" className={styles["header-title"]}>
            {datasetLabel}
          </Typography>
          <IconButton size="small" className={styles["header-icon-btn"]} title="Expand table">
            <KeyboardArrowUp />
          </IconButton>
        </Box>
      )}

      <Collapse
        in={!isCollapsed}
        timeout={300}
        unmountOnExit={false}
        className={styles["table-collapse"]}
      >
        <Box className={styles.content}>
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
                className={[
                  styles["data-grid"],
                  geoidColIndex >= 0 && !!primaryMapMetric ? styles["data-grid--clickable"] : null,
                ]
                  .filter(Boolean)
                  .join(" ")}
              />
            </Box>
          )}
        </Box>
      </Collapse>
    </Paper>
  );
};
