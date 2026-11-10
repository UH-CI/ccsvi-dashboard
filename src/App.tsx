import React, { useCallback, useRef, useState } from "react";
import "./App.css";
import styles from "./App.module.scss";
import { ControlPanel } from "./components/ControlPanel";
import { MultiMapContainer } from "./components/MultiMapContainer";
import { TableViewer } from "./components/TableViewer";
import { usePrimaryMapState } from "./stores";
import { useDatasets } from "./api/queries/datasets";
import { useStartupData } from "./api/queries/startup";
import { useUrlSync } from "./hooks/useUrlSync";
import { takeMapSnapshot } from "./utils/snapshotUtils";

const MIN_TABLE_HEIGHT = 96;

const App: React.FC = () => {
  const [isTableOpen, setIsTableOpen] = useState(true);
  const [isGridView, setIsGridView] = useState(true);
  const [tableHeight, setTableHeight] = useState<number | null>(null);
  const [snapCollapsed, setSnapCollapsed] = useState(false);
  const [snapFullscreen, setSnapFullscreen] = useState(false);
  const multiMapContainerRef = useRef<HTMLDivElement>(null);

  const COLLAPSE_THRESHOLD = 40;

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();

    const onMouseMove = (moveEvent: MouseEvent) => {
      const newHeight = window.innerHeight - moveEvent.clientY;
      const maxHeight = window.innerHeight * 0.85;
      if (newHeight < COLLAPSE_THRESHOLD) {
        setSnapCollapsed(true);
        setSnapFullscreen(false);
        setTableHeight(null);
      } else if (newHeight > maxHeight + 40) {
        setSnapFullscreen(true);
        setSnapCollapsed(false);
        setTableHeight(null);
      } else {
        setSnapCollapsed(false);
        setSnapFullscreen(false);
        setTableHeight(Math.max(MIN_TABLE_HEIGHT, Math.min(maxHeight, newHeight)));
      }
    };

    const onMouseUp = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }, [COLLAPSE_THRESHOLD]);

  const handleSnapshot = useCallback(async () => {
    const el = multiMapContainerRef.current;
    if (!el) return;
    await takeMapSnapshot(el, { customPrefix: "ccsvi-multi-map" });
  }, []);

  const handleTableSizeChange = useCallback((isCollapsed: boolean) => {
    setIsTableOpen(!isCollapsed);
    if (!isCollapsed) { setSnapCollapsed(false); setSnapFullscreen(false); }
  }, []);

  // Get the active/primary map's dataset for the table viewer
  const { dataset: primaryDataset } = usePrimaryMapState();

  const { ready, errors } = useStartupData();
  const datasets = useDatasets();

  // Reads the shared link into the stores, then keeps it in step with them
  useUrlSync();

  // === Error handling ===
  if (errors.length > 0) {
    return (
      <div className={styles["error-container"]}>
        <h2>Error loading data</h2>
        {errors.map((error) => (
          <p key={error}>{error}</p>
        ))}
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  // === Loading ===
  if (!ready) {
    return (
      <div className={styles["loading-container"]}>
        <div>Loading data...</div>
      </div>
    );
  }

  // === Main UI ===
  const activeDatasetObject = datasets && primaryDataset ? datasets[primaryDataset] : null;

  return (
    <div className={styles["app-container"]}>
      <ControlPanel
        isGridView={isGridView}
        onToggleGridView={() => setIsGridView((v) => !v)}
        onSnapshot={handleSnapshot}
      />
      <div className={styles["map-section"]}>
        <MultiMapContainer ref={multiMapContainerRef} isGridView={isGridView} />
        {isTableOpen && primaryDataset && (
          <div className={styles["table-resize-handle"]} onMouseDown={handleResizeStart} />
        )}
        <TableViewer
          activeDataset={primaryDataset}
          datasetInfo={activeDatasetObject}
          onSizeChange={handleTableSizeChange}
          tableHeight={tableHeight}
          collapsed={snapCollapsed}
          fullscreen={snapFullscreen}
        />
      </div>
    </div>
  );
};

export default App;
