import { useState, useEffect, useMemo, useCallback } from "react";
import { Paper, Typography, Box, Collapse, Alert, IconButton } from "@mui/material";
import { DataGrid, useGridApiRef } from "@mui/x-data-grid";
import { KeyboardArrowUp } from "@mui/icons-material";
import { CatalogDataset } from "../../types";
import { useTableResize } from "../../hooks/useTableResize";
import { usePrimaryMapState, useMapStore } from "../../stores/useMapStore";
import { useTableExportStore } from "../../stores/useTableExportStore";
import { useDatasetTable } from "../../api/queries/datasetTable";
import { useFilteredGeoids } from "../../api/queries/filter";
import { CustomTableToolbar } from "./components/CustomTableToolbar";
import { tableCell, tableColumn, useDataGridColumns } from "./hooks/useDataGridColumns";
import { useExtraColumns } from "./hooks/useExtraColumns";
import { useActiveRowSync } from "./hooks/useActiveRowSync";
import styles from "./TableViewer.module.scss";

interface TableViewerProps {
  activeDataset: string;
  datasetInfo: CatalogDataset | null;
}

export const TableViewer: React.FC<TableViewerProps> = ({ activeDataset, datasetInfo }) => {
  const { metric: primaryMapMetric } = usePrimaryMapState();
  const filteredGeoidsSet = useFilteredGeoids();

  const table = useDatasetTable(activeDataset);
  const tableData = table.data ?? null;
  const loading = table.isFetching;
  const error = table.error?.message ?? null;
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 25 });

  const apiRef = useGridApiRef();

  // The one export, used by the toolbar's Export CSV and the Data Analyzer's download: the table as shown
  const exportTable = useCallback(
    () =>
      apiRef.current!.exportDataAsCsv({
        fileName: `${activeDataset}_export`,
        delimiter: ",",
        utf8WithBom: true,
      }),
    [apiRef, activeDataset],
  );
  const setExportTable = useTableExportStore((state) => state.setExportTable);
  useEffect(() => {
    if (!activeDataset || error) return;
    setExportTable(exportTable);
    return () => setExportTable(null);
  }, [activeDataset, error, exportTable, setExportTable]);

  const {
    isCollapsed,
    isFullHeight,
    height,
    toggleCollapse,
    toggleFullHeight,
    setCollapsed,
    startResize,
  } = useTableResize();

  const { columns, rows } = useDataGridColumns(tableData);

  // Columns from what's on the main map (point layers, hazards, the saved raster), built like the dataset's own
  const primaryMapId = useMapStore((state) => state.primaryMapId);
  const isHomelands = Boolean(datasetInfo?.hawaiian_homelands);
  const extraColumns = useExtraColumns(isHomelands, primaryMapId);

  const mergedColumns = useMemo(
    () => [...columns, ...extraColumns.map(tableColumn)],
    [columns, extraColumns],
  );

  const mergedRows = useMemo(
    () =>
      extraColumns.length === 0
        ? rows
        : rows.map((row) => {
            const extra = extraColumns.map((column) => [
              column.field,
              tableCell(column.value(row.id)),
            ]);
            return { ...row, ...Object.fromEntries(extra) };
          }),
    [rows, extraColumns],
  );

  const displayRows = useMemo(
    () =>
      filteredGeoidsSet ? mergedRows.filter((row) => filteredGeoidsSet.has(row.id)) : mergedRows,
    [mergedRows, filteredGeoidsSet],
  );

  const { activeRowId, handleRowClick } = useActiveRowSync({
    apiRef,
    rows: displayRows,
    paginationModel,
    setPaginationModel,
    setCollapsed,
  });

  const datasetLabel = useMemo(() => {
    if (!datasetInfo || !activeDataset) return activeDataset;
    return datasetInfo.label || activeDataset.replace(/_/g, " ").toUpperCase();
  }, [activeDataset, datasetInfo]);

  const metadata = datasetInfo?.metadata;
  const metadataText = metadata ? `Source: ${metadata.citation}` : null;

  if (!activeDataset) {
    return null;
  }

  return (
    <>
      {!isCollapsed && <div className={styles["table-resize-handle"]} onMouseDown={startResize} />}
      <Paper
        elevation={3}
        className={`${styles["table-viewer"]} ${isFullHeight ? styles["table-viewer--full"] : isCollapsed ? styles["table-viewer--collapsed"] : styles["table-viewer--expanded"]}`}
        style={
          !isCollapsed && !isFullHeight && height
            ? { height, maxHeight: "none", flex: "none" }
            : undefined
        }
      >
        {isCollapsed && (
          <Box className={styles.header} onClick={toggleCollapse}>
            <Typography variant="subtitle2" className={styles["header-title"]}>
              {datasetLabel}
            </Typography>
            {metadataText && <span className={styles["metadata-line"]}>{metadataText}</span>}
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
                  columns={mergedColumns}
                  loading={loading}
                  showToolbar
                  density="compact"
                  // Header min-height the stylesheet forces and keeps scroll-to-row from stopping a row short
                  columnHeaderHeight={86}
                  slots={{ toolbar: CustomTableToolbar }}
                  slotProps={{
                    toolbar: {
                      datasetLabel,
                      metadataText,
                      isFullHeight,
                      exportTable,
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
                  onRowClick={primaryMapMetric ? handleRowClick : undefined}
                  hideFooter={false}
                  disableColumnMenu={false}
                  disableColumnFilter={false}
                  disableColumnSelector={false}
                  className={[
                    styles["data-grid"],
                    primaryMapMetric ? styles["data-grid--clickable"] : null,
                  ]
                    .filter(Boolean)
                    .join(" ")}
                />
              </Box>
            )}
          </Box>
        </Collapse>
      </Paper>
    </>
  );
};
