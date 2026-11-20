import dayjs, { type Dayjs } from "dayjs";
import type { LayerMetadata, RasterSource } from "../types";
import hcdpCatalog from "../../config/hcdp_catalog.json";

// One dataset in config/hcdp_catalog.json, with its data type
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

// One data type in config/hcdp_catalog.json: where its data comes from, and its datasets
interface HcdpDataType {
  id: string;
  // Its name wherever the app shows it
  name: string;
  metadata: LayerMetadata & { units?: string };
  datasets: Omit<HcdpRangeRow, "data_type">[];
}

// The data types, in menu order
export const HCDP_DATA_TYPES = (hcdpCatalog as { dataTypes: HcdpDataType[] }).dataTypes;

// The HCDP datasets the map offers
export const HCDP_CATALOG: HcdpRangeRow[] = HCDP_DATA_TYPES.flatMap((type) =>
  type.datasets.map((dataset) => ({ data_type: type.id, ...dataset })),
);

// The distinct non-empty values, sorted
function uniqueSorted<T>(values: (T | undefined | null)[]): T[] {
  return [...new Set(values.filter((v): v is T => v != null && v !== ""))].sort() as T[];
}

// What the user has chosen in the HCDP form
export interface HcdpPicks {
  dataType: string;
  period: string;
  aggregation: string;
  production: string;
  timescale: string;
}

// The choices only some datasets have
export const HCDP_EXTRA_CHOICES = ["aggregation", "production", "timescale"] as const;
export type HcdpExtraChoice = (typeof HCDP_EXTRA_CHOICES)[number];

// The form's options for the user's picks, each pick kept while it's an option and otherwise the first
// option, and the catalog row the picks name. A choice with no options doesn't narrow the rows.
export function hcdpChoices(wanted: HcdpPicks) {
  const pick = (options: string[], want: string) =>
    options.includes(want) ? want : (options[0] ?? "");
  const forType = HCDP_CATALOG.filter((row) => row.data_type === wanted.dataType);
  const periods = uniqueSorted(forType.map((row) => row.period));
  const period = pick(periods, wanted.period);
  const forPeriod = forType.filter((row) => row.period === period);
  const extraOptions = (key: HcdpExtraChoice) => uniqueSorted(forPeriod.map((row) => row[key]));
  const options = {
    period: periods,
    aggregation: extraOptions("aggregation"),
    production: extraOptions("production"),
    timescale: extraOptions("timescale"),
  };
  const picks: HcdpPicks = {
    dataType: wanted.dataType,
    period,
    aggregation: pick(options.aggregation, wanted.aggregation),
    production: pick(options.production, wanted.production),
    timescale: pick(options.timescale, wanted.timescale),
  };
  const row = forPeriod.find((r) =>
    HCDP_EXTRA_CHOICES.every((key) => options[key].length === 0 || r[key] === picks[key]),
  );
  return { options, picks, row };
}

// The catalog's data types in menu order
export function hcdpDataTypes(): string[] {
  return HCDP_DATA_TYPES.map((type) => type.id);
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
  return [hcdpName(row.data_type), ...extras, row.period, date].join(" · ");
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

// A data type's name, as written in config/hcdp_catalog.json
export const hcdpName = (dataType: string): string =>
  HCDP_DATA_TYPES.find((type) => type.id === dataType)!.name;

export const hcdpUnits = (dataType: string): string | undefined =>
  HCDP_DATA_TYPES.find((type) => type.id === dataType)?.metadata.units;

export function formatTimescaleLabel(timescale: string): string {
  const m = /^timescale(\d+)$/i.exec(timescale);
  if (!m) return timescale;
  return `${Number(m[1])}-month`;
}
