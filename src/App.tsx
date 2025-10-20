import React, { useEffect } from 'react';
import './App.css';
import styles from './App.module.scss';
import { ControlPanel } from './components/ControlPanel';
import { MultiMapContainer } from './components/MultiMapContainer';
//import { GenericHazardLayer } from "./components/HazardLayers/GenericHazardLayer.tsx";
import { TableViewer } from './components/TableViewer';
//import { GenericPolygonLayer } from './components/GenericPolygonLayer';
//import { useMapSnapshot } from './hooks/useMapSnapshot';
//import { usePointLayers } from "./hooks/usePointLayers.ts";
//import { useGeometryLayers } from "./hooks/useGeometryLayers.ts"
//import { useDataLoader } from './hooks/useDataLoader';
//import { useAnimatedMapResize, MapResizeHandler } from './hooks/useMapResize';
import { useAppStore, useIsReady, usePointLayerStore } from './stores';
import { useUrlState } from './hooks/useUrlState';
import { usePointLayers } from './hooks/usePointLayers';
import { useHazardLayers } from './hooks/useHazardLayers';
import { useDataFetcher } from "./hooks/useDataFetcher.ts";
import { MetricsData, Dataset, BlockGroupProperties, HawaiianHomelandProperties } from "./types"
import { FeatureCollection, Geometry } from "geojson";
import { DATASETS_CONFIG, POLYGON_LAYERS} from "./config";
//import { useState, useEffect, useRef } from 'react';

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

    const censusBlockGroups = useDataFetcher<FeatureCollection<Geometry, BlockGroupProperties>>(
        POLYGON_LAYERS.censusBlockGroups.path,
        { errorPrefix: 'Failed to load census block group data' }
    );

    const hawaiianHomelands = useDataFetcher<FeatureCollection<Geometry, HawaiianHomelandProperties>>(
        POLYGON_LAYERS.hawaiianHomelands.path,
        { errorPrefix: `Failed to fetch hawaiian homelands data` }
    );

    const pointLayers = usePointLayers(urlState.pointLayers);
    const hazardLayers = useHazardLayers(urlState.hazardLayers);

    // Check if all data is ready
    const isPolygonLayersLoaded = censusBlockGroups.data !== null && hawaiianHomelands.data !== null;

    // Check if all data is ready
    const isReady = metricsData.loaded && blockGroupData.loaded && pointLayers.isInitialized && hazardLayers.isInitialized && isPolygonLayersLoaded;

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
                    hazardLayers={hazardLayers.hazardLayers}
                    toggleHazardLayer={handleHazardLayerToggle}
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
            {/*<ControlPanel*/}
            {/*    dataset={dataset}*/}
            {/*    activeDataset={urlState.dataset}*/}
            {/*    activeDatasetMetric={urlState.metric}*/}
            {/*    onDatasetChange={handleDatasetChange}*/}
            {/*    onMetricChange={handleMetricChange}*/}
            {/*    pointLayers={pointLayers}*/}
                {/* hazardLayers={hazardLayers} */}
            {/*    togglePointLayer={handlePointLayerToggle}*/}
                {/* toggleHazardLayer={handleHazardLayerToggle} */}
            {/*    onTakeSnapshot={handleTakeSnapshot}*/}
            {/*/>*/}

        </div>
    );
};

export default App;