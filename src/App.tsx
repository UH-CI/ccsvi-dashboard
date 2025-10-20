import React from 'react';
import './App.css';
import styles from './App.module.scss';
import { MultiMapContainer } from './components/MultiMapContainer';
//import { GenericHazardLayer } from "./components/HazardLayers/GenericHazardLayer.tsx";
import { TableViewer } from './components/TableViewer';
//import { GenericPolygonLayer } from './components/GenericPolygonLayer';
//import { useMapSnapshot } from './hooks/useMapSnapshot';
//import { usePointLayers } from "./hooks/usePointLayers.ts";
//import { useGeometryLayers } from "./hooks/useGeometryLayers.ts"
//import { useDataLoader } from './hooks/useDataLoader';
//import { useAnimatedMapResize, MapResizeHandler } from './hooks/useMapResize';
import { useUrlState } from './hooks/useUrlState';
import { usePointLayers } from './hooks/usePointLayers';
import { useHazardLayers } from './hooks/useHazardLayers';
import { useDataFetcher } from "./hooks/useDataFetcher.ts";
import { MetricsData, Dataset, BlockGroupProperties, HawaiianHomelandProperties } from "./types"
import { FeatureCollection, Geometry } from "geojson";
import { DATASETS_CONFIG, POLYGON_LAYERS} from "./config";
//import { useState, useEffect, useRef } from 'react';

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

    // Event handlers that update URL state
    const handlePointLayerToggle = (layerId: string) => {
        const currentVisible = urlState.pointLayers;
        const newVisible = currentVisible.includes(layerId)
            ? currentVisible.filter(id => id !== layerId)
            : [...currentVisible, layerId];
        updateUrlState({ pointLayers: newVisible });
    };

    const handleHazardLayerToggle = (layerId: string, isParent = false) => {
        const currentVisible = urlState.hazardLayers ?? [];
        let newVisible = [...currentVisible];

        if (isParent) {
            // Find the parent layer
            const parentLayer = hazardLayers.hazardLayers.find(layer => layer.id === layerId);
            if (!parentLayer) return;

            const allChildIds = parentLayer.subLayers.map(sub => sub.id);
            
            // Check if ANY children are currently visible
            const anyChildrenVisible = allChildIds.some(id => currentVisible.includes(id));

            if (anyChildrenVisible) {
                // If some children are on, turn ALL off (parent and all children)
                newVisible = newVisible.filter(id => !allChildIds.includes(id) && id !== layerId);
            } else {
                // If no children are on, turn ALL on (parent and all children)
                newVisible = Array.from(new Set([...newVisible, layerId, ...allChildIds]));
            }
        } else {
            // Single toggle (child layer)
            if (newVisible.includes(layerId)) {
                newVisible = newVisible.filter(id => id !== layerId);
            } else {
                newVisible.push(layerId);
            }

            // Update parent visibility based on child states
            hazardLayers.hazardLayers.forEach(parent => {
                if (parent.subLayers.some(sub => sub.id === layerId)) {
                    const anyChildrenVisible = parent.subLayers.some(sub =>
                        newVisible.includes(sub.id)
                    );
                    
                    if (anyChildrenVisible) {
                        // If ANY child is visible, ensure parent is visible
                        if (!newVisible.includes(parent.id)) {
                            newVisible.push(parent.id);
                        }
                    } else {
                        // If NO children are visible, remove parent
                        newVisible = newVisible.filter(id => id !== parent.id);
                    }
                }
            });
        }

        updateUrlState({ hazardLayers: newVisible });
    };

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