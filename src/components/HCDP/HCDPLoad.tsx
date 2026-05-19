import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import dayjs, { Dayjs } from "dayjs";
import {
  formatHcdpDataTypeLabel,
  formatTimescaleLabel,
  cloneArrayBuffer,
  fetchHcdpRaster,
  type HcdpRangeRow,
} from "../../utils/hcdpRaster";
import { buildHcdpOverlayTitle, useHCDPStore } from "../../stores/useHCDPStore";
import styles from "./HCDPLoad.module.scss";

const RANGE_JSON = `${import.meta.env.BASE_URL || ""}data/HCDP_API/date_Range_Combined.json`;

function uniqueSorted<T>(values: (T | undefined | null)[]): T[] {
  return [...new Set(values.filter((v): v is T => v != null && v !== ""))].sort() as T[];
}

export interface HCDPLoadProps {
  mapId: string;
}

export const HCDPLoad: React.FC<HCDPLoadProps> = ({ mapId }) => {
  const setRasterOverlay = useHCDPStore((s) => s.setRasterOverlay);
  const [catalog, setCatalog] = useState<HcdpRangeRow[] | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [dataType, setDataType] = useState("");
  const [period, setPeriod] = useState("");
  const [aggregation, setAggregation] = useState("");
  const [production, setProduction] = useState("");
  const [timescale, setTimescale] = useState("");
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [fetching, setFetching] = useState(false);
  const [fetchMessage, setFetchMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(RANGE_JSON);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as HcdpRangeRow[];
        if (cancelled) return;
        setCatalog(data);
        setCatalogError(null);
        const types = uniqueSorted(data.map((r) => r.data_type));
        if (types.length) setDataType((t) => (t && types.includes(t) ? t : types[0]));
      } catch (e) {
        if (!cancelled) {
          setCatalog(null);
          setCatalogError(e instanceof Error ? e.message : "Failed to load HCDP catalog");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const dataTypes = useMemo(
    () => uniqueSorted((catalog ?? []).map((r) => r.data_type)),
    [catalog],
  );

  const periodOptions = useMemo(() => {
    if (!catalog || !dataType) return [];
    return uniqueSorted(catalog.filter((r) => r.data_type === dataType).map((r) => r.period));
  }, [catalog, dataType]);

  const cand = useMemo(() => {
    if (!catalog || !dataType || !period) return [];
    return catalog.filter((r) => r.data_type === dataType && r.period === period);
  }, [catalog, dataType, period]);

  const aggOpts = useMemo(() => uniqueSorted(cand.map((r) => r.aggregation)), [cand]);
  const prodOpts = useMemo(() => uniqueSorted(cand.map((r) => r.production)), [cand]);
  const tsOpts = useMemo(() => uniqueSorted(cand.map((r) => r.timescale)), [cand]);

  useEffect(() => {
    if (!dataType || !catalog) return;
    if (!periodOptions.includes(period)) setPeriod(periodOptions[0] ?? "");
  }, [dataType, period, periodOptions, catalog]);

  useEffect(() => {
    if (aggOpts.length === 0) setAggregation("");
    else if (aggOpts.length === 1) setAggregation(aggOpts[0]);
    else if (!aggOpts.includes(aggregation)) setAggregation(aggOpts[0]);
  }, [aggOpts, aggregation]);

  useEffect(() => {
    if (prodOpts.length === 0) setProduction("");
    else if (prodOpts.length === 1) setProduction(prodOpts[0]);
    else if (!prodOpts.includes(production)) setProduction(prodOpts[0]);
  }, [prodOpts, production]);

  useEffect(() => {
    if (tsOpts.length === 0) setTimescale("");
    else if (tsOpts.length === 1) setTimescale(tsOpts[0]);
    else if (!tsOpts.includes(timescale)) setTimescale(tsOpts[0]);
  }, [tsOpts, timescale]);

  const activeRow = useMemo(() => {
    let rows = cand;
    if (aggOpts.length === 1) rows = rows.filter((r) => r.aggregation === aggOpts[0]);
    else if (aggOpts.length > 1) rows = rows.filter((r) => r.aggregation === aggregation);
    if (prodOpts.length === 1) rows = rows.filter((r) => r.production === prodOpts[0]);
    else if (prodOpts.length > 1) rows = rows.filter((r) => r.production === production);
    if (tsOpts.length === 1) rows = rows.filter((r) => r.timescale === tsOpts[0]);
    else if (tsOpts.length > 1) rows = rows.filter((r) => r.timescale === timescale);
    return rows[0];
  }, [cand, aggOpts, prodOpts, tsOpts, aggregation, production, timescale]);

  const { minDate, maxDate } = useMemo(() => {
    if (!activeRow?.date_range?.[0] || !activeRow?.date_range?.[1]) {
      return { minDate: dayjs("1990-01-01"), maxDate: dayjs() };
    }
    return {
      minDate: dayjs(activeRow.date_range[0]).startOf("day"),
      maxDate: dayjs(activeRow.date_range[1]).startOf("day"),
    };
  }, [activeRow]);

  useEffect(() => {
    setSelectedDate((prev) => {
      if (!activeRow) return prev;
      const next = prev && prev.isValid() ? prev : maxDate;
      if (next.isBefore(minDate, "day")) return minDate;
      if (next.isAfter(maxDate, "day")) return maxDate;
      return next;
    });
  }, [activeRow, minDate, maxDate]);

  const handleLoadRaster = async () => {
    setFetchMessage(null);
    if (!activeRow || !selectedDate) {
      setFetchMessage({ type: "error", text: "Select a valid date for this product." });
      return;
    }
    setFetching(true);
    try {
      const arrayBuffer = await fetchHcdpRaster(activeRow, selectedDate);
      const dateStr = selectedDate.format("YYYY-MM-DD");
      setRasterOverlay(mapId, {
        arrayBuffer: cloneArrayBuffer(arrayBuffer),
        row: activeRow,
        date: dateStr,
        title: buildHcdpOverlayTitle(activeRow, dateStr),
        loadId: Date.now(),
      });
      setFetchMessage({
        type: "success",
        text: `Raster added to map (${(arrayBuffer.byteLength / 1024).toFixed(0)} KB).`,
      });
    } catch (e) {
      setFetchMessage({
        type: "error",
        text: e instanceof Error ? e.message : "Raster request failed.",
      });
    } finally {
      setFetching(false);
    }
  };

  if (catalogError) {
    return (
      <Stack spacing={1} className={styles.root} data-map-id={mapId}>
        <Alert severity="error">{catalogError}</Alert>
      </Stack>
    );
  }

  if (!catalog) {
    return (
      <Stack alignItems="center" className={styles.root} data-map-id={mapId} py={2}>
        <CircularProgress size={28} />
      </Stack>
    );
  }

  return (
    <Stack spacing={2} className={styles.root} data-map-id={mapId}>
      <FormControl size="small" fullWidth>
        <InputLabel id="hcdp-dataset-label">Dataset</InputLabel>
        <Select
          labelId="hcdp-dataset-label"
          label="Dataset"
          value={dataType}
          onChange={(e) => setDataType(e.target.value)}
        >
          {dataTypes.map((dt) => (
            <MenuItem key={dt} value={dt}>
              {formatHcdpDataTypeLabel(dt)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" fullWidth disabled={!periodOptions.length}>
        <InputLabel id="hcdp-period-label">Period</InputLabel>
        <Select
          labelId="hcdp-period-label"
          label="Period"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          {periodOptions.map((p) => (
            <MenuItem key={p} value={p}>
              {p === "day" ? "Day" : p === "month" ? "Month" : p}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {aggOpts.length > 1 && (
        <FormControl size="small" fullWidth>
          <InputLabel id="hcdp-agg-label">Aggregation</InputLabel>
          <Select
            labelId="hcdp-agg-label"
            label="Aggregation"
            value={aggregation}
            onChange={(e) => setAggregation(e.target.value)}
          >
            {aggOpts.map((a) => (
              <MenuItem key={a} value={a}>
                {a.charAt(0).toUpperCase() + a.slice(1)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {prodOpts.length > 1 && (
        <FormControl size="small" fullWidth>
          <InputLabel id="hcdp-prod-label">Production</InputLabel>
          <Select
            labelId="hcdp-prod-label"
            label="Production"
            value={production}
            onChange={(e) => setProduction(e.target.value)}
          >
            {prodOpts.map((p) => (
              <MenuItem key={p} value={p}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      {tsOpts.length > 1 && (
        <FormControl size="small" fullWidth>
          <InputLabel id="hcdp-ts-label">Timescale</InputLabel>
          <Select
            labelId="hcdp-ts-label"
            label="Timescale"
            value={timescale}
            onChange={(e) => setTimescale(e.target.value)}
          >
            {tsOpts.map((t) => (
              <MenuItem key={t} value={t}>
                {formatTimescaleLabel(t)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DatePicker
          label="Date"
          value={selectedDate}
          onChange={(v) => setSelectedDate(v)}
          minDate={minDate}
          maxDate={maxDate}
          disabled={!activeRow}
        />
      </LocalizationProvider>

      <Button
        variant="contained"
        disabled={!activeRow || !selectedDate || fetching}
        onClick={handleLoadRaster}
      >
        {fetching ? <CircularProgress size={22} color="inherit" /> : "Load raster"}
      </Button>

      {fetchMessage && <Alert severity={fetchMessage.type}>{fetchMessage.text}</Alert>}
    </Stack>
  );
};