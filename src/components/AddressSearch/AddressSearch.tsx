import React, { useState, useRef, useCallback, useEffect } from "react";
import SearchIcon from "@mui/icons-material/Search";
import L from "leaflet";
import { OpenStreetMapProvider } from "leaflet-geosearch";
import styles from "./AddressSearch.module.scss";

interface SearchResult {
  x: number;
  y: number;
  label: string;
}

interface AddressSearchProps {
  mapRef: React.RefObject<L.Map | null>;
}

export const AddressSearch: React.FC<AddressSearchProps> = ({ mapRef }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  // The text of the newest search; answers to older text arrive late and are ignored
  const latestRef = useRef("");

  const providerRef = useRef(
    new OpenStreetMapProvider({
      params: { countrycodes: "us", viewbox: "-162,18,-154,23", bounded: 1 },
    }),
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => () => { markerRef.current?.remove(); }, []);

  // Empties the box and forgets any search still on its way
  const clear = useCallback(() => {
    latestRef.current = "";
    setQuery("");
    setResults([]);
    setLoading(false);
    setFailed(false);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    clear();
  }, [clear]);

  const handleToggle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (open) clear();
      setOpen(!open);
    },
    [open, clear],
  );

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, close]);

  const handleQueryChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (!val.trim()) {
        clear();
        setQuery(val);
        return;
      }
      setQuery(val);
      latestRef.current = val;
      debounceRef.current = setTimeout(async () => {
        setLoading(true);
        setFailed(false);
        try {
          const res = await providerRef.current.search({ query: val });
          if (val === latestRef.current) setResults(res.slice(0, 6));
        } catch {
          if (val === latestRef.current) {
            setResults([]);
            setFailed(true);
          }
        } finally {
          if (val === latestRef.current) setLoading(false);
        }
      }, 350);
    },
    [clear],
  );

  const handleSelect = useCallback(
    (result: SearchResult) => {
      const { x: lng, y: lat } = result;
      const map = mapRef.current;
      if (map) {
        markerRef.current?.remove();
        markerRef.current = L.marker([lat, lng]).addTo(map).bindPopup(result.label).openPopup();
        map.flyTo([lat, lng], 14);
      }
      close();
    },
    [mapRef, close],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => { if (e.key === "Escape") close(); },
    [close],
  );

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <button
        type="button"
        className={`${styles.btn} ${open ? styles["btn--active"] : ""}`}
        onClick={handleToggle}
        title="Search address"
        aria-label="Search address"
      >
        <SearchIcon fontSize="small" />
      </button>
      {open && (
        <div className={styles.dropdown} onClick={(e) => e.stopPropagation()}>
          <input
            ref={inputRef}
            className={styles.input}
            value={query}
            onChange={handleQueryChange}
            onKeyDown={handleKeyDown}
            placeholder="Search address in Hawaiʻi…"
          />
          {loading && <div className={styles.status}>Searching…</div>}
          {!loading && results.length > 0 && (
            <ul className={styles.results}>
              {results.map((r, i) => (
                <li key={i} className={styles.result} onMouseDown={() => handleSelect(r)}>
                  {r.label}
                </li>
              ))}
            </ul>
          )}
          {!loading && failed && (
            <div className={styles.status}>Search failed. Check your connection and try again.</div>
          )}
          {!loading && !failed && query.trim() && results.length === 0 && (
            <div className={styles.status}>No results found</div>
          )}
        </div>
      )}
    </div>
  );
};