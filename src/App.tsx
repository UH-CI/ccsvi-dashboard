import React, { useEffect, useState } from "react";
import "./App.css";
import styles from "./App.module.scss";
import { ControlPanel } from "./components/ControlPanel";
import { MultiMapContainer } from "./components/MultiMapContainer";
import { TableViewer } from "./components/TableViewer";
import {
  useAppStore,
  useIsReady,
  usePointLayerStore,
  useHazardLayersStore,
  useRasterLayersStore,
  useMapStore,
} from "./stores";
import { useUrlSync } from "./hooks/useUrlSync";
import { deserializeMapConfigs, validateAndNormalize } from "./utils/urlSerializer";
import { initializeStoresFromUrl } from "./utils/storeInitializer";

const App: React.FC = () => {
  const [isUrlInitialized, setIsUrlInitialized] = useState(false);

  const primaryDataset = useMapStore((state) => {
    const primary = state.mapConfigs.find((c) => c.id === state.primaryMapId);
    return primary?.dataset || "";
  });

  const errors = useAppStore((state) => state.errors);
  const fetchAllData = useAppStore((state) => state.fetchAllData);
  const fetchPointLayerConfigs = usePointLayerStore((state) => state.fetchPointLayerConfigs);
  const blockGroupData = useAppStore((state) => state.blockGroupData);
  const fetchHazardLayerConfigs = useHazardLayersStore((state) => state.fetchHazardLayerConfigs);
  const hazardLoading = useHazardLayersStore((state) => state.loading);
  const hazardError = useHazardLayersStore((state) => state.error);

  const fetchRasterLayerConfigs = useRasterLayersStore((state) => state.fetchRasterLayerConfigs);
  const rasterLoading = useRasterLayersStore((state) => state.loading);
  const rasterError = useRasterLayersStore((state) => state.error);

  const isReady = useIsReady();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlState = deserializeMapConfigs(params);
    const validatedState = validateAndNormalize(urlState);

    initializeStoresFromUrl(validatedState);
    setIsUrlInitialized(true);
  }, []);

  useUrlSync(isUrlInitialized);

  useEffect(() => {
    fetchAllData();
    fetchPointLayerConfigs();
    fetchHazardLayerConfigs();
    fetchRasterLayerConfigs();
  }, [fetchAllData, fetchPointLayerConfigs, fetchHazardLayerConfigs, fetchRasterLayerConfigs]);

  const hasErrors = Object.values(errors).some((error) => error !== null);
  if (hasErrors || hazardError || rasterError) {
    return (
      <div className={styles["error-container"]}>
        <h2>Error loading data</h2>
        {Object.entries(errors).map(([key, error]) => error && <p key={key}>{error}</p>)}
        {hazardError && <p>{hazardError}</p>}
        {rasterError && <p>{rasterError}</p>}
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  if (!isReady || hazardLoading || rasterLoading) {
    return (
      <div className={styles["loading-container"]}>
        <div>Loading data...</div>
      </div>
    );
  }

  const activeDatasetObject =
    blockGroupData && primaryDataset ? blockGroupData[primaryDataset] : null;

  return (
    <div className={styles["app-container"]}>
      <ControlPanel maxMaps={4} />
      <div className={styles["map-section"]}>
        <MultiMapContainer maxMaps={4} />
        {activeDatasetObject !== null || primaryDataset ? (
          <div className={styles["table-section"]}>
            <TableViewer activeDataset={primaryDataset} datasetInfo={activeDatasetObject} />
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default App;
