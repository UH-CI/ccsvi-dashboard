import React from 'react';
import './App.css';
import styles from './App.module.scss';
import { MultiMapContainer } from './components/MultiMapContainer';
import { TableViewer } from './components/TableViewer';
import { useUrlState } from './hooks/useUrlState';
import { usePointLayers } from './hooks/usePointLayers';
import { usePolygonLayer } from "./hooks/usePolygonLayer.ts";
import { useDataFetcher } from "./hooks/useDataFetcher.ts";
import { MetricsData, Dataset, BlockGroupProperties, HawaiianHomelandProperties } from "./types"
import {blockGroupPolygonLayerConfigs, mapParams} from "./config.ts";

const App: React.FC = () => {
    const { urlState, updateUrlState } = useUrlState();

    // Contains actual demographic metric values per geographic block group
    const metricsData = useDataFetcher<MetricsData>(
        mapParams.censusDatasetsPath,
        {errorPrefix: 'Failed to load metrics data' }
    );

    // Configuration metadata for census datasets
    const blockGroupData = useDataFetcher<Dataset>(
        mapParams.censusDatasetsInfoPath,
        {errorPrefix: 'Failed to load dataset metadata' }
    );

    const shouldLoadHawaiianHomelands = blockGroupData.data?.[urlState.dataset]?.hawaiianHomelands || false;

    const censusLayer = usePolygonLayer<BlockGroupProperties>(
        blockGroupPolygonLayerConfigs.census
    );

    const homelandsLayer = usePolygonLayer<HawaiianHomelandProperties>({
        ...blockGroupPolygonLayerConfigs.hawaiianHomelands,
        enabled: shouldLoadHawaiianHomelands
    });

    const pointLayers = usePointLayers(urlState.pointLayers);

    // Check if all data is ready
    const isPolygonLayersLoaded = shouldLoadHawaiianHomelands
        ? (censusLayer.data !== null && homelandsLayer.data !== null)
        : censusLayer.data !== null;

    // Check if all data is ready
    const isReady = metricsData.loaded && blockGroupData.loaded && isPolygonLayersLoaded && pointLayers.isInitialized;

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

    if (metricsData.error || blockGroupData.error) {
        return (
            <div className={styles['error-container']}>
                <h2>Error loading data</h2>
                {metricsData.error && <p>{metricsData.error}</p>}
                {blockGroupData.error && <p>{blockGroupData.error}</p>}
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

    const activeDatasetObject = blockGroupData.data && urlState.dataset
        ? blockGroupData.data[urlState.dataset]
        : null;

    return (
        <div className={styles['app-container']}>
            <div className={styles['map-section']}>
                <MultiMapContainer
                    maxMaps={4}
                    dataset={blockGroupData.data}
                    metricsData={metricsData.data}
                    censusBlockPolygons={censusLayer.data}
                    hawaiianHomelandPolygons={homelandsLayer.data}
                    pointLayers={pointLayers.pointLayers}
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