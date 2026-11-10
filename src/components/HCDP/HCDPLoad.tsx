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
  HCDP_CATALOG,
  hcdpDataTypes,
  hcdpFallbackRange,
  hcdpSource,
  uniqueSorted,
  buildHcdpOverlayTitle,
} from "../../utils/hcdpRaster";
import { useMapLayersStore } from "../../stores/useMapLayersStore";
import styles from "./HCDPLoad.module.scss";
import { ApiError } from "../../api/client";
import { queryClient } from "../../api/queryClient";
import { useHcdpDateRange } from "../../api/queries/hcdp";
import { rasterInfoQuery } from "../../api/queries/rasterInfo";

// The date picker's limits until a dataset's range is known
const DEFAULT_MIN_DATE = dayjs("1990-01-01");
const DEFAULT_MAX_DATE = dayjs().subtract(1, "day");


export interface HCDPLoadProps {
  mapId: string;
}

export const HCDPLoad: React.FC<HCDPLoadProps> = ({ mapId }) => {
  const setRaster = useMapLayersStore((s) => s.setRaster);
  const hasRasterOverlay = useMapLayersStore((s) => s.rasters[mapId]?.kind === "hcdp");
  const catalog = HCDP_CATALOG;
  const dataTypes = useMemo(() => hcdpDataTypes(), []);
  const [dataType, setDataType] = useState(dataTypes[0]);
  const [period, setPeriod] = useState("");
  const [aggregation, setAggregation] = useState("");
  const [production, setProduction] = useState("");
  const [timescale, setTimescale] = useState("");
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [fetching, setFetching] = useState(false);
  const [fetchMessage, setFetchMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null,
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


  const dateRange = useHcdpDateRange(activeRow);
  const loadingDates = dateRange.isFetching;

  // HCDP's live dates, or the catalog's if they can't be fetched
  const liveRange = useMemo(
    () =>
      dateRange.data && {
        min: dayjs(dateRange.data[0]).startOf("day"),
        max: dayjs(dateRange.data[1]).startOf("day"),
      },
    [dateRange.data],
  );
  const fallbackRange = useMemo(
    () => (dateRange.isError && activeRow ? hcdpFallbackRange(activeRow) : undefined),
    [dateRange.isError, activeRow],
  );
  const apiMinDate = liveRange?.min ?? fallbackRange?.min ?? DEFAULT_MIN_DATE;
  const apiMaxDate = liveRange?.max ?? fallbackRange?.max ?? DEFAULT_MAX_DATE;

  // Live dates select the latest day; catalog dates keep the chosen day if it's still in range
  useEffect(() => {
    if (liveRange) setSelectedDate(liveRange.max);
  }, [liveRange]);

  useEffect(() => {
    if (!fallbackRange) return;
    setSelectedDate((prev) => {
      if (!prev || !prev.isValid() || prev.isAfter(fallbackRange.max, "day")) return fallbackRange.max;
      if (prev.isBefore(fallbackRange.min, "day")) return fallbackRange.min;
      return prev;
    });
  }, [fallbackRange]);

  const handleClearRaster = () => {
    setRaster(mapId, null);
    setFetchMessage({ type: "success", text: "HCDP raster removed from map." });
  };

  const handleLoadRaster = async () => {

    setFetchMessage(null);
    if (!activeRow || !selectedDate) {
      setFetchMessage({ type: "error", text: "Select a valid date for this product." });
      return;
    }
    setFetching(true);

    try {
      // Asking for the range makes the server fetch the file, so a date with no file fails here
      const source = hcdpSource(activeRow, selectedDate);
      await queryClient.fetchQuery(rasterInfoQuery(source));

      setRaster(mapId, {
        ...source,
        title: buildHcdpOverlayTitle(activeRow, selectedDate.format("YYYY-MM-DD")),
      });
      setFetchMessage({ type: "success", text: "Raster added to map." });
    } catch (e) {
      setFetchMessage({
        type: "error",
        text:
          e instanceof ApiError && e.status === 404
            ? "The requested file could not be found"
            : "Raster request failed.",
      });
    } finally {
      setFetching(false);
    }
  };

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
          label={loadingDates ? "Fetching Available Dates..." : "Date"}
          value={selectedDate}
          onChange={(v) => {
            if (v && period === "month") {
              setSelectedDate(v.startOf("month"));
            }
            else
            {
              setSelectedDate(v)
            }
          }}
          minDate={apiMinDate}
          maxDate={apiMaxDate}
          disabled={!activeRow || loadingDates}
          views={period === "month" ? ["year", "month"] : ["year", "month", "day"]}
          format={period === "month" ? "YYYY-MM" : "YYYY-MM-DD"}
        />
      </LocalizationProvider>

      <Stack direction="row" spacing={1}>
        <Button
          variant="contained"
          fullWidth
          disabled={!activeRow || !selectedDate || fetching || loadingDates}
          onClick={handleLoadRaster}
        >
          {fetching ? <CircularProgress size={22} color="inherit" /> : "Load raster"}
        </Button>
        <Button
          variant="outlined"
          disabled={!hasRasterOverlay || fetching}
          onClick={handleClearRaster}
        >
          Clear
        </Button>
      </Stack>

      {fetchMessage && <Alert severity={fetchMessage.type}>{fetchMessage.text}</Alert>}
    </Stack>
  );
};