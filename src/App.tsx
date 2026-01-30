import React, { useEffect, useState } from 'react';
import './App.css';
import styles from './App.module.scss';
import { ControlPanel } from './components/ControlPanel';
import { MultiMapContainer } from './components/MultiMapContainer';
import { TableViewer } from './components/TableViewer';
import {
    useAppStore,
    useIsReady,
    usePointLayerStore,
    useHazardLayersStore,
    useRasterLayersStore,
    useMapStore
} from './stores';
import { useUrlSync } from './hooks/useUrlSync';
import { deserializeMapConfigs, validateAndNormalize } from './utils/urlSerializer';
import { initializeStoresFromUrl } from './utils/storeInitializer';

const App: React.FC = () => {
    const [isUrlInitialized, setIsUrlInitialized] = useState(false);

    // TEMPORARY - Get primary map's dataset for table viewer
    // Just uses the first map for now
    const primaryDataset = useMapStore((state) => state.mapConfigs[0]?.dataset || '');

    // Get data from stores
    const errors = useAppStore(state => state.errors);
    const fetchAllData = useAppStore(state => state.fetchAllData);
    const fetchPointLayerConfigs = usePointLayerStore(state => state.fetchPointLayerConfigs);
    const blockGroupData = useAppStore(state => state.blockGroupData);
    const fetchHazardLayerConfigs = useHazardLayersStore(
        (state) => state.fetchHazardLayerConfigs
    );
    const hazardLoading = useHazardLayersStore((state) => state.loading);
    const hazardError = useHazardLayersStore((state) => state.error);
    
    const fetchRasterLayerConfigs = useRasterLayersStore(
      (state) => state.fetchRasterLayerConfigs
    );
    const rasterLoading = useRasterLayersStore((state) => state.loading);
    const rasterError = useRasterLayersStore((state) => state.error);
    
    const isReady = useIsReady();

    // Initialize stores from URL on mount (runs once)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const urlState = deserializeMapConfigs(params);
        const validatedState = validateAndNormalize(urlState);

        initializeStoresFromUrl(validatedState);
        setIsUrlInitialized(true);
    }, []);

    // Enable bidirectional URL sync after initialization
    useUrlSync(isUrlInitialized);

    // Fetch all data on mount
    useEffect(() => {
        fetchAllData();
        fetchPointLayerConfigs();
        fetchHazardLayerConfigs();
        fetchRasterLayerConfigs();
  }, [fetchAllData, fetchPointLayerConfigs, fetchHazardLayerConfigs, fetchRasterLayerConfigs]);

    // === Error handling ===
  const hasErrors = Object.values(errors).some((error) => error !== null);
  if (hasErrors || hazardError || rasterError) {
    return (
      <div className={styles['error-container']}>
        <h2>Error loading data</h2>
        {Object.entries(errors).map(
          ([key, error]) => error && <p key={key}>{error}</p>
        )}
        {hazardError && <p>{hazardError}</p>}
        {rasterError && <p>{rasterError}</p>}
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

    // === Loading ===
  if (!isReady || hazardLoading || rasterLoading) {
        return (
            <div className={styles['loading-container']}>
                <div>Loading data...</div>
            </div>
        );
    }

    // === Main UI ===
    const activeDatasetObject =
        blockGroupData && primaryDataset
            ? blockGroupData[primaryDataset]
            : null;

    return (
        <div className={styles['app-container']}>
            <div className={styles['map-section']}>
                <MultiMapContainer maxMaps={4} />

                <TableViewer
                    activeDataset={primaryDataset}
                    datasetInfo={activeDatasetObject}
                />
            </div>

            <ControlPanel maxMaps={4} />
        </div>
    );
};

export default App;
