import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useEffect } from "react";
import { useStore } from "../store";

export default function DateSelector() {
  const setDate = useStore((s) => s.setDate);
  const setDateRange = useStore((s) => s.setDateRange);
  const minDate = useStore((s) => s.minDate);
  const maxDate = useStore((s) => s.maxDate);

  useEffect(() => {
    fetch("/api/date-range?datatype=temperature&period=day")
      .then(res => res.json())
      .then(data => {
        setDateRange(new Date(data[0]), new Date(data[1]));
      });
  }, []);

  return (
    <DatePicker
      onChange={(date) => {
        const formatted = date.toISOString().split("T")[0];
        setDate(formatted);
      }}
      minDate={minDate}
      maxDate={maxDate}
      dateFormat="yyyy-MM-dd"
      placeholderText="Select a date"
    />
  );
}