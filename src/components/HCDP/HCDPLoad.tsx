import React, { useEffect, useMemo, useState, useRef } from "react";
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

const DATA_TYPE_ORDER = [
  "rainfall",
  "temperature",
  "relative_humidity",
  "ndvi_modis",
  "spi",
  "ignition_probability"
]

function uniqueSorted<T>(values: (T | undefined | null)[]): T[] {
  return [...new Set(values.filter((v): v is T => v != null && v !== ""))].sort() as T[];
}

function getCustomSortedDataTypes(catalog: HcdpRangeRow[] | null): string[] {
  if (!catalog) return [];
  
  const unique = [...new Set(catalog.map((r) => r.data_type).filter((v): v is string => v != null && v !== ""))];
  
  return unique.sort((a, b) => {
    const idxA = DATA_TYPE_ORDER.indexOf(a);
    const idxB = DATA_TYPE_ORDER.indexOf(b);
    
    // If both are in the custom order list, sort by array index position
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    // If only 'a' is prioritized, move it up
    if (idxA !== -1) return -1;
    // If only 'b' is prioritized, move it up
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });
}


export interface HCDPLoadProps {
  mapId: string;
}

export const HCDPLoad: React.FC<HCDPLoadProps> = ({ mapId }) => {
  const setRasterOverlay = useHCDPStore((s) => s.setRasterOverlay);
  const clearRasterOverlay = useHCDPStore((s) => s.clearRasterOverlay);
  const hasRasterOverlay = useHCDPStore((s) => s.overlaysByMap[mapId] != null);
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

  // Dynamic Live Bounds State
  const [apiMinDate, setApiMinDate] = useState<Dayjs>(dayjs("1990-01-01"));
  const [apiMaxDate, setApiMaxDate] = useState<Dayjs>(dayjs().subtract(1, "day"));
  const [loadingDates, setLoadingDates] = useState(false);

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
        //const types = uniqueSorted(data.map((r) => r.data_type));
        const types = getCustomSortedDataTypes(data);
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
    //() => uniqueSorted((catalog ?? []).map((r) => r.data_type)),
    () => getCustomSortedDataTypes(catalog),
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


  //---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

  // LIVE DATE FETCHING: Triggers whenever a dropdown value changes
  useEffect(() => {
    if (!dataType || !period) return;

    if (aggOpts.length > 0 && !aggOpts.includes(aggregation)) return;
    if (prodOpts.length > 0 && !prodOpts.includes(production)) return;
    if (tsOpts.length > 0 && !tsOpts.includes(timescale)) return;
    
    let cancelled = false;
    
    const fetchLiveDateRange = async () => {
      setLoadingDates(true);
      
      try {
        const params = new URLSearchParams();
        params.append("datatype", dataType);
        params.append("period", period);

        
        if (aggregation && aggOpts.includes(aggregation)) {
          params.append("aggregation", aggregation);
        }
        
        // EXCEPTION: Always force 'production=new' for Rainfall Day silently
        if (dataType === "rainfall" && period === "day") {
          params.append("production", "new");
        } else if (production && prodOpts.includes(production)) {
          params.append("production", production);
        }

        if (timescale && tsOpts.includes(timescale)) {
          params.append("timescale", timescale);
        }

        const appBase = (import.meta.env.BASE_URL || "/").replace(/\/?$/, "/");
        const url = `${appBase}api/datasets/date/range?${params.toString()}`;

        console.log("Url range call: ", url);
        //const url = `https://api.hcdp.ikewai.org/datasets/date/range?${params.toString()}`;
        const res = await fetch(url);
        
        if (!res.ok) throw new Error("API Date Fetch Failed");
        
        const data = await res.json();
        const dateRange = Array.isArray(data) ? data : Object.values(data);
        
        if (!cancelled && dateRange.length >= 2) {
          let min = dayjs(dateRange[0]).startOf("day");
          const max = dayjs(dateRange[1]).startOf("day");

          // Keep SPI scale adjusting applied strictly to the 1990 base limit
          // if (dataType === "spi") {
          //   const scale = activeRow?.scale ?? (timescale ? parseInt(timescale.replace("timescale", ""), 10) : 1);
          //   const baseDate = dayjs("1990-01-01").startOf("day");
          //   min = scale === 12 ? baseDate.add(12, "month") : baseDate.add(scale - 1, "month");
          // }

          setApiMinDate(min);
          setApiMaxDate(max);
          
          setSelectedDate(max);
        }
      } catch (err) {
        console.warn("Falling back to local catalog dates:", err);
        // Fallback safely to JSON catalog bounds if internet fails
        if (!cancelled && activeRow?.date_range) {
          let fallbackMin = dayjs(activeRow.date_range[0]).startOf("day");
          let fallbackMax = dayjs(activeRow.date_range[1]).startOf("day");
          
          if (dataType === "spi") {
            const scale = activeRow?.scale ?? (timescale ? parseInt(timescale.replace("timescale", ""), 10) : 1);
            fallbackMin = scale === 12 ? dayjs("1990-01-01").add(12, "month") : dayjs("1990-01-01").add(scale - 1, "month");
          }

          setApiMinDate(fallbackMin);
          setApiMaxDate(fallbackMax);
          
          setSelectedDate((prev) => {
            if (!prev || !prev.isValid() || prev.isAfter(fallbackMax, "day")) return fallbackMax;
            if (prev.isBefore(fallbackMin, "day")) return fallbackMin;
            return prev;
          });
        }
      } finally {
        if (!cancelled) setLoadingDates(false);
      }
    };

    fetchLiveDateRange();

    return () => { cancelled = true; };
  }, [dataType, period, aggregation, production, timescale, activeRow, aggOpts, prodOpts, tsOpts]);

  //---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

  const handleClearRaster = () => {
    clearRasterOverlay(mapId);
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