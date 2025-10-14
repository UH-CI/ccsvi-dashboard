import React, { useEffect } from 'react';
import './App.css';
import styles from './App.module.scss';
import { ControlPanel } from './components/ControlPanel';
import { MultiMapContainer } from './components/MultiMapContainer';
import { TableViewer } from './components/TableViewer';
import { useAppStore, useIsReady, useMapStore, usePointLayerStore } from './stores';
import { useUrlState } from './hooks/useUrlState';

const App: React.FC = () => {
    // Get URL state (currently broken)
    const { urlState, updateUrlState } = useUrlState();
    
    // Get data from stores
    const { 
        blockGroupData,
        errors,
        fetchAllData 
    } = useAppStore();
    
    const isReady = useIsReady();
    
    // Point layers store
    const {
        fetchPointLayerConfigs,
        setVisibleLayerIds,
        fetchPointLayerData,
        pointLayerConfigs,
        visibleLayerIds
    } = usePointLayerStore();

    // Map store
    const {
        mapConfigs,
        addMap,
        removeMap,
        updateMapConfig,
        toggleMapVisibility
    } = useMapStore();

    // Fetch all data on mount
    useEffect(() => {
        fetchAllData();
        fetchPointLayerConfigs(urlState.pointLayers);
    }, []);

    useEffect(() => {
        setVisibleLayerIds(urlState.pointLayers);
    }, [urlState.pointLayers]);

    // Load data for visible layers
    useEffect(() => {
        if (urlState.pointLayers.length > 0) {
            urlState.pointLayers.forEach(layerId => {
                fetchPointLayerData(layerId);
            });
        }
    }, [urlState.pointLayers, fetchPointLayerData]);

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
    const handlePointLayerToggle = (layerId: string) => {
        const { toggleLayerVisibility } = usePointLayerStore.getState();
        toggleLayerVisibility(layerId);
        
        // Update URL state
        const currentVisible = urlState.pointLayers;
        const newVisible = currentVisible.includes(layerId)
            ? currentVisible.filter(id => id !== layerId)
            : [...currentVisible, layerId];
        updateUrlState({ pointLayers: newVisible });
    };

    const pointLayers = React.useMemo(() =>
            pointLayerConfigs.map(config => ({
                ...config,
                visible: visibleLayerIds.has(config.id)
            })),
        [pointLayerConfigs, visibleLayerIds]
    );

    // // Snapshot handler
    // const handleTakeSnapshot = useCallback(async () => {
    //     try {
    //         await takeSnapshot({
    //             activeDataset: urlState.dataset,
    //             activeDatasetMetric: urlState.metric,
    //             customPrefix: 'hawaii-census-map',
    //             quality: 0.9
    //         }, mapWrapperRef);
    //     } catch (error) {
    //         alert(`Failed to take snapshot. Please try again. ${error}`);
    //     }
    // }, [takeSnapshot, urlState.dataset, urlState.metric]);
    // }, []);

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
                dataset={blockGroupData}
                mapConfigs={mapConfigs}
                activeDataset={urlState.dataset}
                activeDatasetMetric={urlState.metric}
                onDatasetChange={(value) => updateUrlState({ dataset: value, metric: '' })}
                onMetricChange={(value) => updateUrlState({ metric: value })}
                pointLayers={pointLayers}
                togglePointLayer={handlePointLayerToggle}
                onAddMap={addMap}
                onRemoveMap={removeMap}
                onUpdateMapConfig={updateMapConfig}
                onToggleVisibility={toggleMapVisibility}
                maxMaps={4}
            />
        </div>
    );
};

export default App;