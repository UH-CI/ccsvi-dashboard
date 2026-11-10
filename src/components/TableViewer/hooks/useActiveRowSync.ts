import { useState, useEffect, useCallback, useRef } from "react";
import { gridExpandedSortedRowIdsSelector, useGridApiRef } from "@mui/x-data-grid";
import { useMapStore, usePrimaryMapState } from "../../../stores";
import type { TableGridRow } from "./useDataGridColumns";

interface PaginationModel {
  page: number;
  pageSize: number;
}

interface UseActiveRowSyncArgs {
  apiRef: ReturnType<typeof useGridApiRef>;
  rows: TableGridRow[];
  paginationModel: PaginationModel;
  setPaginationModel: React.Dispatch<React.SetStateAction<PaginationModel>>;
  setCollapsed: (collapsed: boolean) => void;
}

interface ActiveRowSync {
  activeRowId: string | null;
  handleRowClick: (params: { row: TableGridRow }) => void;
}

// Two-way link between the map's active feature and the table, by geoid (each row's id):
// map selection → highlight + paginate + scroll the matching row; row click → map selection.
export const useActiveRowSync = ({
  apiRef,
  rows,
  paginationModel,
  setPaginationModel,
  setCollapsed,
}: UseActiveRowSyncArgs): ActiveRowSync => {
  const primaryMapId = useMapStore((state) => state.primaryMapId);
  const updateMapActiveFeature = useMapStore((state) => state.updateMapActiveFeature);
  const { activeFeature } = usePrimaryMapState();

  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const pendingScrollRowRef = useRef<number | null>(null);

  // Sync map active feature → table row highlight + scroll
  useEffect(() => {
    const activeGeoid = activeFeature?.geoid;
    if (!activeGeoid || !rows.some((row) => row.id === activeGeoid)) {
      setActiveRowId(null);
      return;
    }

    setActiveRowId(activeGeoid);
    setCollapsed(false);

    // Position in the grid's own sorted + filtered order; a row hidden by a column filter isn't jumped to
    const visibleIndex = gridExpandedSortedRowIdsSelector(apiRef).indexOf(activeGeoid);
    if (visibleIndex < 0) return;

    const targetPage = Math.floor(visibleIndex / paginationModel.pageSize);

    // scrollToIndexes takes the index across all pages and subtracts the page offset itself
    if (targetPage !== paginationModel.page) {
      pendingScrollRowRef.current = visibleIndex;
      setPaginationModel((prev) => ({ ...prev, page: targetPage }));
    } else {
      requestAnimationFrame(() => {
        apiRef.current?.scrollToIndexes({ rowIndex: visibleIndex });
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFeature?.geoid, rows, setCollapsed]);

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
    (params: { row: TableGridRow }) =>
      updateMapActiveFeature(primaryMapId, { geoid: params.row.id }),
    [primaryMapId, updateMapActiveFeature],
  );

  return { activeRowId, handleRowClick };
};
