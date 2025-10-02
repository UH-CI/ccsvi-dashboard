import React from 'react';
import './App.css';
import styles from './App.module.scss';
import { MultiMapContainer } from './components/MultiMapContainer';
import { TableViewer } from './components/TableViewer';
import { useUrlState } from './hooks/useUrlState';
import { usePointLayers } from './hooks/usePointLayers';
import { useDataFetcher } from "./hooks/useDataFetcher.ts";
import { MetricsData, Dataset, BlockGroupProperties, HawaiianHomelandProperties } from "./types"
import { FeatureCollection, Geometry } from "geojson";
import { DATASETS_CONFIG, POLYGON_LAYERS} from "./config";

const App: React.FC = () => {
    const { urlState, updateUrlState } = useUrlState();

    // Contains actual demographic metric values per geographic block group
    const metricsData = useDataFetcher<MetricsData>(
        DATASETS_CONFIG.censusDatasetsPath,
        {errorPrefix: 'Failed to load metrics data' }
    );

    // Configuration metadata for census datasets
    const blockGroupData = useDataFetcher<Dataset>(
        DATASETS_CONFIG.censusDatasetsInfoPath,
        {errorPrefix: 'Failed to load dataset metadata' }
    );

    const shouldLoadHawaiianHomelands = blockGroupData.data?.[urlState.dataset]?.hawaiianHomelands || false;

    const censusBlockGroups = useDataFetcher<FeatureCollection<Geometry, BlockGroupProperties>>(
        POLYGON_LAYERS.censusBlockGroups.path,
        { errorPrefix: 'Failed to load census block group data' }

    )

    const hawaiianHomelands = useDataFetcher<FeatureCollection<Geometry, HawaiianHomelandProperties>>(
        shouldLoadHawaiianHomelands ? POLYGON_LAYERS.hawaiianHomelands.path : null,
        { errorPrefix: `Failed to fetch hawaiian homelands data` }
    );

    const pointLayers = usePointLayers(urlState.pointLayers);

    // Check if all data is ready
    const isPolygonLayersLoaded = shouldLoadHawaiianHomelands
        ? (censusBlockGroups.data !== null && hawaiianHomelands.data !== null)
        : censusBlockGroups.data !== null;

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
                    polygonLayers={{
                        censusBlockGroups: censusBlockGroups.data,
                        hawaiianHomelands: hawaiianHomelands.data
                    }}
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