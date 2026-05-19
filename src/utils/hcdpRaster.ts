import type { Dayjs } from "dayjs";

/** Copy bytes so georaster workers can transfer without detaching the stored buffer. */
export function cloneArrayBuffer(buffer: ArrayBuffer): ArrayBuffer {
  return buffer.slice(0);
}

/** One row from `public/data/HCDP_API/date_Range_Combined.json`. */
export interface HcdpRangeRow {
  data_type: string;
  period: string;
  date_range: [string, string];
  aggregation?: string;
  production?: string;
  timescale?: string;
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

/** Build query params for HCDP `/raster` (same names as date-range API in the project notebook). */
export function hcdpRasterSearchParams(
  row: HcdpRangeRow,
  date: Dayjs,
  extent: string = "statewide",
): URLSearchParams {
  const dateStr =
    row.period === "month" ? date.startOf("month").format("YYYY-MM-DD") : date.format("YYYY-MM-DD");
  const p = new URLSearchParams({
    datatype: row.data_type,
    period: row.period,
    date: dateStr,
    extent,
  });
  if (row.aggregation) p.set("aggregation", row.aggregation);
  if (row.production) p.set("production", row.production);
  if (row.timescale) p.set("timescale", row.timescale);
  return p;
}

/**
 * Same-origin URL for the HCDP raster proxy (`/api/raster` → api.hcdp.ikewai.org).
 *
 * The Bearer token must never be set here. In local dev, Vite adds
 * `Authorization: Bearer …` from `public/data/HCDP_API/.env` (or project `.env`)
 * via `vite.config.ts`. For a standalone backend, use `public/data/HCDP_API/server.py`.
 */
export function hcdpRasterUrl(row: HcdpRangeRow, date: Dayjs, extent?: string): string {
  const appBase = (import.meta.env.BASE_URL || "/").replace(/\/?$/, "/");
  const qs = hcdpRasterSearchParams(row, date, extent).toString();
  return `${appBase}api/raster?${qs}`;
}

/** Fetch GeoTIFF bytes through the proxy (token stays server-side). */
export async function fetchHcdpRaster(
  row: HcdpRangeRow,
  date: Dayjs,
  extent?: string,
): Promise<ArrayBuffer> {
  const res = await fetch(hcdpRasterUrl(row, date, extent));
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(errText || `HCDP raster request failed (${res.status})`);
  }
  return res.arrayBuffer();
}
