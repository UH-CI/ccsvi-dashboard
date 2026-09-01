import { useMemo } from "react";
import { GridColDef } from "@mui/x-data-grid";
import { ParsedCSVData } from "../../../utils/csvParser";
import styles from "../TableViewer.module.scss";

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

interface DataGridColumns {
  columns: GridColDef[];
  rows: Record<string, string | number>[];
  geoidColIndex: number;
}

// Builds DataGrid columns + rows from parsed CSV: per-column type detection,
// number formatting, substring quick-filter, and the geography column index.
export const useDataGridColumns = (tableData: ParsedCSVData | null): DataGridColumns => {
  return useMemo(() => {
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
                // Counts get comma separators; decimals match the one place the backend stores.
                return Number.isInteger(num) ? num.toLocaleString() : num.toFixed(1);
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
          const rounded = Number.isInteger(num) ? num : Math.round(num * 10) / 10;
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
};
