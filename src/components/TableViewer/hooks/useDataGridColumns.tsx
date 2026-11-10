import { useMemo } from "react";
import { GridColDef } from "@mui/x-data-grid";
import type { DatasetTable, TableColumn } from "../../../types";
import styles from "../TableViewer.module.scss";

const cleanHeaderForDisplay = (header: string): string => {
  return header.replace(/!!/g, " → ").trim();
};

const calculateColumnWidth = (header: string): number => {
  const cleanedHeader = cleanHeaderForDisplay(header);
  // Longest unbreakable run sets min width needed to avoid mid-word wraps.
  const longestToken = cleanedHeader
    .split(/\s+/)
    .reduce((a, b) => (a.length >= b.length ? a : b), "");
  const tokenWidth = longestToken.length * 7.5 + 40; // 0.75rem bold glyph avg + sort icon/padding
  const baseWidth = Math.max(cleanedHeader.length * 6, tokenWidth);
  const minWidth = 150;
  const maxWidth = 400;
  return Math.min(Math.max(baseWidth, minWidth), maxWidth);
};

// One grid column, built the same way for every column in the table: the heading with " → ", a width
// from the heading, "—" for an empty cell, commas for whole numbers and one decimal otherwise, and substring search
export const tableColumn = ({
  field,
  heading,
  type,
  sortable = true,
}: {
  field: string;
  heading: string;
  type: TableColumn["type"];
  sortable?: boolean;
}): GridColDef => {
  const displayHeader = cleanHeaderForDisplay(heading);
  return {
    field,
    headerName: displayHeader,
    type: type === "number" ? "number" : "string",
    flex: 1,
    minWidth: calculateColumnWidth(heading),
    resizable: true,
    sortable,
    filterable: true,
    hideable: true,
    renderHeader: () => (
      <div title={displayHeader} className={styles["custom-header"]}>
        {displayHeader}
      </div>
    ),
    valueFormatter: (value: unknown) => {
      if (value == null) return "—";
      if (typeof value !== "number") return String(value);
      return Number.isInteger(value) ? value.toLocaleString() : value.toFixed(1);
    },
    // Substring search for every column; MUI's own matches numbers exactly and text by its start
    getApplyQuickFilterFn: (filterValue: string) => {
      if (filterValue == null || filterValue === "") return null;
      const search = String(filterValue).toLowerCase();
      return (cellValue: unknown) => {
        if (cellValue == null) return false;
        return String(cellValue).toLowerCase().includes(search);
      };
    },
  };
};

// A cell as the table holds it: whole numbers as they are, other numbers to one decimal, anything else unchanged
export const tableCell = (value: string | number | null) =>
  typeof value === "number" && !Number.isInteger(value) ? Math.round(value * 10) / 10 : value;

// One grid row: its id is the area's geoid, then one cell per column
export type TableGridRow = { id: string } & Record<string, string | number | null>;

interface DataGridColumns {
  columns: GridColDef[];
  rows: TableGridRow[];
}

// The grid's columns and rows from the server's table
export const useDataGridColumns = (table: DatasetTable | null): DataGridColumns => {
  return useMemo(() => {
    if (!table) return { columns: [], rows: [] };

    const columns = table.columns.map((column, index) =>
      tableColumn({ field: `col_${index}`, heading: column.heading, type: column.type }),
    );

    const rows = table.rows.map((row) => {
      const gridRow: TableGridRow = { id: row.geoid };
      row.cells.forEach((cell, cellIndex) => {
        gridRow[`col_${cellIndex}`] = tableCell(cell);
      });
      return gridRow;
    });

    return { columns, rows };
  }, [table]);
};
