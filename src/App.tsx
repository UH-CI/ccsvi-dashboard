import React from 'react';
import './App.css';
import styles from './App.module.scss';
import { MultiMapContainer } from './components/MultiMapContainer';
import { TableViewer } from './components/TableViewer';
import { useDataLoader } from './hooks/useDataLoader';
import { useUrlState } from './hooks/useUrlState';
import { usePointLayers } from './hooks/usePointLayers';

const App: React.FC = () => {
    // URL state management
    const { urlState, updateUrlState } = useUrlState();

    // Data loading
    const {
        dataset,
        homelandsData,
        loading,
        error,
        isInitialDataLoaded,
        hawaiianHomelands
    } = useDataLoader(urlState.dataset);

    // Point layers
    const { pointLayers } = usePointLayers(urlState.pointLayers);

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

    // Event handlers that update URL state
    const handlePointLayerToggle = (layerId: string) => {
        const currentVisible = urlState.pointLayers;
        const newVisible = currentVisible.includes(layerId)
            ? currentVisible.filter(id => id !== layerId)
            : [...currentVisible, layerId];
        updateUrlState({ pointLayers: newVisible });
    };

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

    // Error handling
    if (error) {
        return (
            <div className={styles['error-container']}>
                <h2>Error loading data</h2>
                <p>{error}</p>
                <button onClick={() => window.location.reload()}>
                    Retry
                </button>
            </div>
        );
    }

    // Loading state
    if (loading || !isInitialDataLoaded) {
        return (
            <div className={styles['loading-container']}>
                <div>Loading data...</div>
                {hawaiianHomelands && !homelandsData && (
                    <div className={styles['loading-subtext']}>
                        Loading Hawaiian Homelands data...
                    </div>
                )}
            </div>
        );
    }

    // // Determine initial map position
    // const initialMapPosition =
    //     urlState.lat && urlState.lng && urlState.zoom
    //         ? { lat: urlState.lat, lng: urlState.lng, zoom: urlState.zoom }
    //         : undefined;
    //
    // const mapCenter: [number, number] = initialMapPosition
    //     ? [initialMapPosition.lat, initialMapPosition.lng]
    //     : mapParams.mapCenter;
    //
    // const mapZoom = initialMapPosition ? initialMapPosition.zoom : mapParams.mapZoom;

    // Get active dataset object for table viewer
    const activeDatasetObject = dataset && urlState.dataset ? dataset[urlState.dataset] : null;

    return (
        <div className={styles['app-container']}>
            <div className={styles['map-section']}>
                <MultiMapContainer 
                    dataset={dataset} 
                    maxMaps={4}
                    pointLayers={pointLayers}
                    togglePointLayer={handlePointLayerToggle}
                    // onTakeSnapshot={handleTakeSnapshot}
                />

                <TableViewer
                    activeDataset={urlState.dataset}
                    datasetInfo={activeDatasetObject}
                    // onSizeChange={handleTableSizeChange}
                />
            </div>

            {/*<ControlPanel*/}
            {/*    dataset={dataset}*/}
            {/*    activeDataset={urlState.dataset}*/}
            {/*    activeDatasetMetric={urlState.metric}*/}
            {/*    onDatasetChange={handleDatasetChange}*/}
            {/*    onMetricChange={handleMetricChange}*/}
            {/*    pointLayers={pointLayers}*/}
            {/*    togglePointLayer={handlePointLayerToggle}*/}
            {/*    onTakeSnapshot={handleTakeSnapshot}*/}
            {/*/>*/}

        </div>
    );
};

export default App;