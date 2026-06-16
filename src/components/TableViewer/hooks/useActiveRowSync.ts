import { useState, useEffect, useCallback, useRef } from "react";
import { useGridApiRef } from "@mui/x-data-grid";
import { useMapStore, usePrimaryMapState } from "../../../stores";

interface PaginationModel {
  page: number;
  pageSize: number;
}

interface UseActiveRowSyncArgs {
  apiRef: ReturnType<typeof useGridApiRef>;
  rows: Record<string, string | number>[];
  geoidColIndex: number;
  paginationModel: PaginationModel;
  setPaginationModel: React.Dispatch<React.SetStateAction<PaginationModel>>;
  setCollapsed: (collapsed: boolean) => void;
}

interface ActiveRowSync {
  activeRowId: number | null;
  handleRowClick: (params: { row: Record<string, unknown> }) => void;
}

// Two-way link between the map's active feature and the table:
// map selection → highlight + paginate + scroll the matching row; row click → map selection.
export const useActiveRowSync = ({
  apiRef,
  rows,
  geoidColIndex,
  paginationModel,
  setPaginationModel,
  setCollapsed,
}: UseActiveRowSyncArgs): ActiveRowSync => {
  const primaryMapId = useMapStore((state) => state.primaryMapId);
  const updateMapActiveFeature = useMapStore((state) => state.updateMapActiveFeature);
  const { activeFeature } = usePrimaryMapState();

  const [activeRowId, setActiveRowId] = useState<number | null>(null);
  const pendingScrollRowRef = useRef<number | null>(null);

  // Sync map active feature → table row highlight + scroll
  useEffect(() => {
    const activeGeoid = activeFeature?.geoid;
    if (!activeGeoid || geoidColIndex < 0 || rows.length === 0) {
      setActiveRowId(null);
      return;
    }

    const rowIndex = rows.findIndex((row) => {
      const rawGeoid = String(row[`col_${geoidColIndex}`] ?? "");
      return rawGeoid.replace(/^\d+US/i, "") === activeGeoid;
    });

    if (rowIndex < 0) {
      setActiveRowId(null);
      return;
    }

    setActiveRowId(rowIndex);
    setCollapsed(false);

    const targetPage = Math.floor(rowIndex / paginationModel.pageSize);
    const rowIndexInPage = rowIndex % paginationModel.pageSize;

    if (targetPage !== paginationModel.page) {
      pendingScrollRowRef.current = rowIndexInPage;
      setPaginationModel((prev) => ({ ...prev, page: targetPage }));
    } else {
      requestAnimationFrame(() => {
        apiRef.current?.scrollToIndexes({ rowIndex: rowIndexInPage });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFeature?.geoid, geoidColIndex, rows, setCollapsed]);

  // After a page change triggered by the above effect, execute the pending scroll
  useEffect(() => {
    if (pendingScrollRowRef.current === null) return;
    const idx = pendingScrollRowRef.current;
    pendingScrollRowRef.current = null;
    requestAnimationFrame(() => {
      apiRef.current?.scrollToIndexes({ rowIndex: idx });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginationModel.page]);

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

  return { activeRowId, handleRowClick };
};
