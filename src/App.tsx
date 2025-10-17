import React, { useEffect } from 'react';
import './App.css';
import styles from './App.module.scss';
import { ControlPanel } from './components/ControlPanel';
import { MultiMapContainer } from './components/MultiMapContainer';
import { TableViewer } from './components/TableViewer';
import { useAppStore, useIsReady, usePointLayerStore } from './stores';
import { useUrlState } from './hooks/useUrlState';

const App: React.FC = () => {
    // Get URL state (currently broken)
    const { urlState } = useUrlState();
    
    // Get data from stores
    const errors = useAppStore(state => state.errors);
    const fetchAllData = useAppStore(state => state.fetchAllData);
    const fetchPointLayerConfigs = usePointLayerStore(state => state.fetchPointLayerConfigs);
    const blockGroupData = useAppStore(state => state.blockGroupData);
    
    const isReady = useIsReady();

    // Fetch all data on mount
    useEffect(() => {
        fetchAllData();
        fetchPointLayerConfigs(urlState.pointLayers);
    }, []);

    // Load data for visible layers
    // useEffect(() => {
    //     if (urlState.pointLayers.length > 0) {
    //         urlState.pointLayers.forEach(layerId => {
    //             fetchPointLayerData(layerId);
    //         });
    //     }
    // }, [urlState.pointLayers, fetchPointLayerData]);

    // // Handle table size changes with smooth animation
    // const handleTableSizeChange = useCallback(() => {
    //     animateResize(mapRef);
    // }, [animateResize, mapRef]);
    //
    // // Map events component
    // const MapEvents = () => {
    //     const map = useMap();
    //
    //     useEffect(() => {
    //         mapRef.current = map;
    //     }, [map]);
    //
    //     useMapEvents({
    //         click: () => {
    //             setActiveFeature(null);
    //         },
    //     });
    //     return null;
    // };

    // Event handlers

    // Check for errors
    const hasErrors = Object.values(errors).some(error => error !== null);
    if (hasErrors) {
        return (
            <div className={styles['error-container']}>
                <h2>Error loading data</h2>
                {Object.entries(errors).map(([key, error]) => 
                    error && <p key={key}>{error}</p>
                )}
                <button onClick={() => window.location.reload()}>
                    Retry
                </button>
            </div>
        );
    }

    if (!isReady) {
        return (
            <div className={styles['loading-container']}>
                <div>Loading data...</div>
            </div>
        );
    }

    const activeDatasetObject = blockGroupData && urlState.dataset
        ? blockGroupData[urlState.dataset]
        : null;

    return (
        <div className={styles['app-container']}>
            <div className={styles['map-section']}>
                <MultiMapContainer
                    maxMaps={4}
                    // onTakeSnapshot={handleTakeSnapshot}
                />

                <TableViewer
                    activeDataset={urlState.dataset}
                    datasetInfo={activeDatasetObject}
                    // onSizeChange={handleTableSizeChange}
                />
            </div>

            <ControlPanel
                maxMaps={4}
            />
        </div>
    );
};

export default App;