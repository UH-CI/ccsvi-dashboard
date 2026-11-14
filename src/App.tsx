import React, { useCallback, useRef, useState } from "react";
import styles from "./App.module.scss";
import { ControlPanel } from "./components/ControlPanel/ControlPanel";
import { MultiMapContainer } from "./components/MultiMapContainer/MultiMapContainer";
import { TableViewer } from "./components/TableViewer/TableViewer";
import { usePrimaryMapState } from "./stores/useMapStore";
import { useMetric } from "./api/queries/metrics";
import { useStartupData } from "./api/queries/startup";
import { useUrlSync } from "./hooks/useUrlSync";
import { takeMapSnapshot } from "./utils/snapshotUtils";

const App: React.FC = () => {
  const [isGridView, setIsGridView] = useState(true);
  const multiMapContainerRef = useRef<HTMLDivElement>(null);

  const handleSnapshot = useCallback(async () => {
    const el = multiMapContainerRef.current;
    if (!el) return;
    await takeMapSnapshot(el, { customPrefix: "ccsvi-multi-map" });
  }, []);

  // Get the active/primary map's dataset for the table viewer
  const { metric: primaryMetric } = usePrimaryMapState();
  const primary = useMetric(primaryMetric || undefined);
  const primaryDataset = primary?.datasetId ?? "";

  const { ready, errors } = useStartupData();

  // Reads the shared link into the stores, then keeps it in step with them
  useUrlSync();

  // The startup data couldn't be loaded
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

  // The startup data is still loading
  if (!ready) {
    return (
      <div className={styles["loading-container"]}>
        <div>Loading data...</div>
      </div>
    );
  }

  // The main map's dataset, for the table
  const activeDatasetObject = primary?.dataset ?? null;

  return (
    <div className={styles["app-container"]}>
      <ControlPanel
        isGridView={isGridView}
        onToggleGridView={() => setIsGridView((v) => !v)}
        onSnapshot={handleSnapshot}
      />
      <div className={styles["map-section"]}>
        <MultiMapContainer ref={multiMapContainerRef} isGridView={isGridView} />
        <TableViewer activeDataset={primaryDataset} datasetInfo={activeDatasetObject} />
      </div>
    </div>
  );
};

export default App;
