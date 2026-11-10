import dayjs, { type Dayjs } from "dayjs";
import type { RasterSource } from "../types";
import hcdpCatalog from "../../config/hcdp_catalog.json";

/** One row from `config/hcdp_catalog.json`. */
export interface HcdpRangeRow {
  data_type: string;
  period: string;
  date_range: [string, string];
  aggregation?: string;
  production?: string;
  timescale?: string;
  // SPI's timescale in months, as text ("12")
  scale?: string;
}

// The HCDP datasets the map offers
export const HCDP_CATALOG = hcdpCatalog as HcdpRangeRow[];

// Data types in this order first, then any others alphabetically
const DATA_TYPE_ORDER = [
  "rainfall",
  "temperature",
  "relative_humidity",
  "ndvi_modis",
  "spi",
  "ignition_probability",
];

// The distinct non-empty values, sorted
export function uniqueSorted<T>(values: (T | undefined | null)[]): T[] {
  return [...new Set(values.filter((v): v is T => v != null && v !== ""))].sort() as T[];
}

// The catalog's data types in menu order
export function hcdpDataTypes(): string[] {
  const unique = [...new Set(HCDP_CATALOG.map((r) => r.data_type))];
  return unique.sort((a, b) => {
    const idxA = DATA_TYPE_ORDER.indexOf(a);
    const idxB = DATA_TYPE_ORDER.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });
}

// One catalog row as the server's HCDP choice: datatype, period and the row's extra choices
export function hcdpSelection(row: HcdpRangeRow): Record<string, string> {
  return {
    datatype: row.data_type,
    period: row.period,
    ...(row.aggregation ? { aggregation: row.aggregation } : {}),
    ...(row.production ? { production: row.production } : {}),
    ...(row.timescale ? { timescale: row.timescale } : {}),
  };
}

// One row and date as a raster the tile server draws; a month is asked for by its first day
export function hcdpSource(
  row: HcdpRangeRow,
  date: Dayjs,
): Extract<RasterSource, { kind: "hcdp" }> {
  const day = row.period === "month" ? date.startOf("month") : date;
  return { kind: "hcdp", params: { ...hcdpSelection(row), date: day.format("YYYY-MM-DD") } };
}

// The HCDP raster's name in its legend and popup: dataset, its extra choices, period and date
export function buildHcdpOverlayTitle(row: HcdpRangeRow, date: string): string {
  const extras = [
    row.aggregation,
    row.production,
    row.timescale?.replace(/^timescale/i, "TS "),
  ].filter(Boolean);
  return [formatHcdpDataTypeLabel(row.data_type), ...extras, row.period, date].join(" · ");
}

// The catalog's dates, used when HCDP's live range can't be fetched. An SPI timescale of n months
// starts n - 1 months after 1990-01-01 (12 months starts a full year later).
export function hcdpFallbackRange(row: HcdpRangeRow): { min: Dayjs; max: Dayjs } {
  const max = dayjs(row.date_range[1]).startOf("day");
  if (row.data_type !== "spi") return { min: dayjs(row.date_range[0]).startOf("day"), max };
  const scale = Number(row.scale ?? row.timescale?.replace("timescale", "") ?? 1);
  const start = dayjs("1990-01-01");
  return { min: scale === 12 ? start.add(12, "month") : start.add(scale - 1, "month"), max };
}

export function formatHcdpDataTypeLabel(dataType: string): string {
  return dataType
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function formatTimescaleLabel(timescale: string): string {
  const m = /^timescale(\d+)$/i.exec(timescale);
  if (!m) return timescale;
  return `${Number(m[1])}-month`;
}
