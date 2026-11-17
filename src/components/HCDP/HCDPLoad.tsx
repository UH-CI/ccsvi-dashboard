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
  buildHcdpOverlayTitle,
  formatTimescaleLabel,
  hcdpChoices,
  hcdpDataTypes,
  hcdpName,
  hcdpFallbackRange,
  hcdpSource,
  type HcdpExtraChoice,
  type HcdpPicks,
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

const DATA_TYPES = hcdpDataTypes();

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

// The choices only some datasets have; each is shown when it has more than one option
const EXTRA_FIELDS: {
  key: HcdpExtraChoice;
  label: string;
  labelId: string;
  format: (v: string) => string;
}[] = [
  { key: "aggregation", label: "Aggregation", labelId: "hcdp-agg-label", format: capitalize },
  { key: "production", label: "Production", labelId: "hcdp-prod-label", format: capitalize },
  { key: "timescale", label: "Timescale", labelId: "hcdp-ts-label", format: formatTimescaleLabel },
];

export interface HCDPLoadProps {
  mapId: string;
}

export const HCDPLoad: React.FC<HCDPLoadProps> = ({ mapId }) => {
  const setRaster = useMapLayersStore((s) => s.setRaster);
  const hasRasterOverlay = useMapLayersStore((s) => s.rasters[mapId]?.kind === "hcdp");
  const [wanted, setWanted] = useState<HcdpPicks>({
    dataType: DATA_TYPES[0],
    period: "",
    aggregation: "",
    production: "",
    timescale: "",
  });
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [fetching, setFetching] = useState(false);
  const [fetchMessage, setFetchMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const { options, picks, row: activeRow } = useMemo(() => hcdpChoices(wanted), [wanted]);
  const { period } = picks;
  // A change keeps every other pick as it's shown, so a pick carries over to the next options when it's still one of them
  const choose = (change: Partial<HcdpPicks>) => setWanted({ ...picks, ...change });

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
      if (!prev || !prev.isValid() || prev.isAfter(fallbackRange.max, "day"))
        return fallbackRange.max;
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
          value={picks.dataType}
          onChange={(e) => choose({ dataType: e.target.value })}
        >
          {DATA_TYPES.map((dt) => (
            <MenuItem key={dt} value={dt}>
              {hcdpName(dt)}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" fullWidth disabled={!options.period.length}>
        <InputLabel id="hcdp-period-label">Period</InputLabel>
        <Select
          labelId="hcdp-period-label"
          label="Period"
          value={period}
          onChange={(e) => choose({ period: e.target.value })}
        >
          {options.period.map((p) => (
            <MenuItem key={p} value={p}>
              {p === "day" ? "Day" : p === "month" ? "Month" : p}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {EXTRA_FIELDS.filter(({ key }) => options[key].length > 1).map(
        ({ key, label, labelId, format }) => (
          <FormControl key={key} size="small" fullWidth>
            <InputLabel id={labelId}>{label}</InputLabel>
            <Select
              labelId={labelId}
              label={label}
              value={picks[key]}
              onChange={(e) => choose({ [key]: e.target.value })}
            >
              {options[key].map((option) => (
                <MenuItem key={option} value={option}>
                  {format(option)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ),
      )}

      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <DatePicker
          label={loadingDates ? "Fetching Available Dates..." : "Date"}
          value={selectedDate}
          onChange={(v) => setSelectedDate(v && period === "month" ? v.startOf("month") : v)}
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
