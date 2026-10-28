import { useState, useEffect, useMemo } from "react";
import { Paper, Typography, Box, Collapse, Alert, IconButton } from "@mui/material";
import { DataGrid, useGridApiRef } from "@mui/x-data-grid";
import { KeyboardArrowUp } from "@mui/icons-material";
import { ParsedCSVData } from "../../utils/csvParser";
import { DatasetMetadata } from "../../types";
import { getDatasetTable } from "../../api/client";
import { useTableResize } from "../../hooks/useTableResize";
import { usePrimaryMapState, useFilterStore, useMapStore } from "../../stores";
import { usePointCountsForTable, usePointNamesForTable } from "../../hooks/usePointCounts";
import { useSavedRasterForTable } from "../../utils/savedRaster";
import { useHazardOverlapsForTable } from "../../hooks/useHazardOverlapsForTable";
import { CustomTableToolbar } from "./components/CustomTableToolbar";
import { useDataGridColumns } from "./hooks/useDataGridColumns";
import { useActiveRowSync } from "./hooks/useActiveRowSync";
import styles from "./TableViewer.module.scss";

interface DatasetInfo {
  metricName?: string;
  metricLabel?: string;
  hawaiianHomelands?: boolean;
  metadata?: DatasetMetadata | null;
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

  const geoidFromRow = (row: Record<string, string | number>): string => {
    if (geoidColIndex < 0) return "";
    const raw = String(row[`col_${geoidColIndex}`] ?? "");
    return raw.replace(/^\d+US/i, "");
  };

  // Point counts: one extra column per currently-visible point layer
  const primaryMapId = useMapStore((state) => state.primaryMapId);
  const isHomelands = Boolean(datasetInfo?.hawaiianHomelands);
  const { layers: pointLayers, getCount } = usePointCountsForTable(isHomelands, primaryMapId);
  const { getNames } = usePointNamesForTable(isHomelands, primaryMapId);

  const pointCountColumns = useMemo(
    () =>
      pointLayers.map((layer) => ({
        field: `pointcount_${layer.id}`,
        headerName: layer.name,
        type: "number" as const,
        flex: 1,
        minWidth: 120,
        sortable: true,
        filterable: true,
        hideable: true,
      })),
    [pointLayers],
  );

  const pointNameColumns = useMemo(
    () =>
      pointLayers.map((layer) => ({
        field: `pointnames_${layer.id}`,
        headerName: `${layer.name} (names)`,
        flex: 1,
        minWidth: 200,
        sortable: false,
        filterable: true,
        hideable: true,
      })),
    [pointLayers],
  );

  // Raster mean and max: two extra columns for the raster currently visible on the map
  const savedRaster = useSavedRasterForTable(isHomelands, primaryMapId);

  const rasterColumns = useMemo(
    () =>
      savedRaster
        ? [
            ["raster_mean", "mean"],
            ["raster_max", "max"],
          ].map(([field, stat]) => ({
            field,
            headerName: `${savedRaster.name} (${stat}${savedRaster.units ? `, ${savedRaster.units}` : ""})`,
            type: "number" as const,
            flex: 1,
            minWidth: 160,
            sortable: true,
            filterable: true,
            hideable: true,
          }))
        : [],
    [savedRaster?.name, savedRaster?.units],
  );

  // Hazard overlap: one Yes/No column per hazard or sub-layer currently visible on the map
  const { hazards, touches } = useHazardOverlapsForTable(primaryMapId);

  const hazardColumns = useMemo(
    () =>
      hazards.map((hazard) => ({
        field: `hazard_${hazard.key}`,
        headerName: `${hazard.label} (overlaps)`,
        flex: 1,
        minWidth: 160,
        sortable: true,
        filterable: true,
        hideable: true,
      })),
    [hazards],
  );

  const mergedColumns = useMemo(
    () => [...columns, ...pointCountColumns, ...pointNameColumns, ...hazardColumns, ...rasterColumns],
    [columns, pointCountColumns, pointNameColumns, hazardColumns, rasterColumns],
  );

  const mergedRows = useMemo(() => {
    if (pointLayers.length === 0 && !savedRaster && hazards.length === 0) return rows;
    return rows.map((row) => {
      const geoid = geoidFromRow(row);
      const extra: Record<string, number | string> = {};
      for (const layer of pointLayers) {
        extra[`pointcount_${layer.id}`] = getCount(layer.id, geoid);
        extra[`pointnames_${layer.id}`] = getNames(layer.id, geoid).join(", ") || "—";
      }
      if (savedRaster) {
        extra.raster_mean = savedRaster.getMean(geoid) ?? "";
        extra.raster_max = savedRaster.getMax(geoid) ?? "";
      }
      for (const hazard of hazards) {
        extra[`hazard_${hazard.key}`] = touches(hazard.key, geoid) ? "Yes" : "No";
      }
      return { ...row, ...extra };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, pointLayers, getCount, getNames, savedRaster, hazards, touches, geoidColIndex]);

  const displayRows = useMemo(() => {
    if (!filteredGeoidsSet || geoidColIndex < 0) return mergedRows;
    return mergedRows.filter((row) => filteredGeoidsSet.has(geoidFromRow(row)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mergedRows, filteredGeoidsSet, geoidColIndex]);

  const { activeRowId, handleRowClick } = useActiveRowSync({
    apiRef,
    rows: displayRows,
    geoidColIndex,
    paginationModel,
    setPaginationModel,
    setCollapsed,
  });

  const datasetLabel = useMemo(() => {
    if (!datasetInfo || !activeDataset) return activeDataset;
    return datasetInfo.metricLabel || activeDataset.replace(/_/g, " ").toUpperCase();
  }, [activeDataset, datasetInfo]);

  const metadata = datasetInfo?.metadata;
  const metadataText = metadata
    ? `Source: ${metadata.citation}, Table ${metadata.table_id.split(".")[1]}`
    : null;

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
