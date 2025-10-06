import React from 'react';
import './App.css';
import styles from './App.module.scss';
import { MultiMapContainer } from './components/MultiMapContainer';
import { GenericHazardLayer } from "./components/HazardLayers/GenericHazardLayer.tsx";
import { TableViewer } from './components/TableViewer';
//import { GenericPolygonLayer } from './components/GenericPolygonLayer';
import { useMapSnapshot } from './hooks/useMapSnapshot';
//import { usePointLayers } from "./hooks/usePointLayers.ts";
import { useGeometryLayers } from "./hooks/useGeometryLayers.ts"
//import { useDataLoader } from './hooks/useDataLoader';
//import { useAnimatedMapResize, MapResizeHandler } from './hooks/useMapResize';
import { useUrlState } from './hooks/useUrlState';
import { usePointLayers } from './hooks/usePointLayers';
import { useDataFetcher } from "./hooks/useDataFetcher.ts";
import { MetricsData, Dataset, BlockGroupProperties, HawaiianHomelandProperties } from "./types"
import { FeatureCollection, Geometry } from "geojson";
import { DATASETS_CONFIG, POLYGON_LAYERS} from "./config/";
import { useState, useEffect, useRef } from 'react';

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

    // Check if all data is ready
    const isPolygonLayersLoaded = censusBlockGroups.data !== null && hawaiianHomelands.data !== null

    // Check if all data is ready
    const isReady = metricsData.loaded && blockGroupData.loaded && pointLayers.isInitialized && isPolygonLayersLoaded;

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

    // const handleHazardLayerToggle = (layerId: string) => {
    //     console.log("handleHazardLayerToggle called for:", layerId);

    //     const currentVisible = urlState.hazardLayers ?? [];
    //     const newVisible = currentVisible.includes(layerId)
    //         ? currentVisible.filter(id => id !== layerId)
    //         : [...currentVisible, layerId];

    //     console.log('Updating URL with new layers:', newVisible);
    //     updateUrlState({ hazardLayers: newVisible });
    // }
    const handleHazardLayerToggle = (layerId: string, isParent = false) => {
        console.log("handleHazardLayerToggle called for:", layerId);
    
        const currentVisible = urlState.hazardLayers ?? [];
        let newVisible = [...currentVisible];
    
        // recursive finder
        const findLayer = (layers: typeof hazardLayers, id: string): any | undefined => {
            for (const layer of layers) {
                if (layer.id === id) return layer;
                if (layer.children) {
                    const found = findLayer(layer.children, id);
                    if (found) return found;
                }
            }
            return undefined;
        };
    
        const layer = findLayer(hazardLayers, layerId);
        if (!layer) return;
    
        if (isParent && layer.children) {
            // If parent → toggle all children
            const allChildIds = layer.children.map(c => c.id);
            const allVisible = allChildIds.every(id => currentVisible.includes(id));
    
            if (allVisible) {
                // remove all
                newVisible = newVisible.filter(id => !allChildIds.includes(id) && id !== layerId);
            } else {
                // add all
                newVisible = Array.from(new Set([...newVisible, layerId, ...allChildIds]));
            }
        } else {
            // Toggle single (child or independent parent)
            if (newVisible.includes(layerId)) {
                newVisible = newVisible.filter(id => id !== layerId);
            } else {
                newVisible.push(layerId);
            }
    
            // If it’s a child, sync parent visibility
            hazardLayers.forEach(parent => {
                if (parent.children?.some(c => c.id === layerId)) {
                    const allVisible = parent.children.every(c => newVisible.includes(c.id));
                    if (allVisible) {
                        if (!newVisible.includes(parent.id)) newVisible.push(parent.id);
                    } else {
                        newVisible = newVisible.filter(id => id !== parent.id);
                    }
                }
            });
        }
    
        console.log('Updating URL with new hazard layers:', newVisible);
        updateUrlState({ hazardLayers: newVisible });
    };

    // Snapshot handler
    const handleTakeSnapshot = useCallback(async () => {
        try {
            await takeSnapshot({
                activeDataset: urlState.dataset,
                activeDatasetMetric: urlState.metric,
                customPrefix: 'hawaii-census-map',
                quality: 0.9
            }, mapWrapperRef);
        } catch (error) {
            alert(`Failed to take snapshot. Please try again. ${error}`);
        }
    }, [takeSnapshot, urlState.dataset, urlState.metric]);

    // Error handling
    if (error) {
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
                <div className={styles['map-wrapper']} ref={mapWrapperRef}>
                    <MapContainer
                        center={mapCenter}
                        zoom={mapZoom}
                        minZoom={mapParams.minZoom}
                        maxBounds={mapParams.maxBounds}
                        maxBoundsViscosity={mapParams.maxBoundsViscosity}
                        className={styles['map-container']}
                    >
                        <MapResizeHandler />
                        <MapEvents />
                        <MapComponent
                            activeFeature={activeFeature}
                            onMapMove={handleMapMove}
                            initialPosition={initialMapPosition}
                        />
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; OpenStreetMap contributors'
                        />
                        {geoData && metricsData && dataset && (
                            <GenericPolygonLayer<BlockGroupProperties>
                                key={`census-${urlState.dataset}-${urlState.metric}`}
                                data={geoData.features}
                                style={censusStyle}
                                onFeatureClick={highlightFeature}
                                geoidProperty="geoid20"
                                getMetricValue={getMetricValue}
                                activeMetric={urlState.metric}
                                popupConfig={censusPopupConfig}
                                ref={onGeoJsonLoad}
                            />
                        )}
                        {hawaiianHomelands && homelandsData && (
                            <GenericPolygonLayer<HawaiianHomelandProperties>
                                key={`homelands-${urlState.dataset}-${urlState.metric}`}
                                data={homelandsData.features}
                                style={homelandStyle}
                                onFeatureClick={highlightFeature}
                                geoidProperty="GEOID10"
                                getMetricValue={getMetricValue}
                                activeMetric={urlState.metric}
                                popupConfig={homelandsPopupConfig}
                                ref={onHomelandsLoad}
                            />
                        )}
                        {pointLayers.map(layer => (
                            <GenericPointMarkers key={layer.id} layer={layer} />
                        ))}
                        {hazardLayers.map((layer) => (
                            <GenericHazardLayer key={layer.id} layer={layer} />
                        ))}
                    </MapContainer>

                    <MapLegend
                        dataset={dataset}
                        activeDataset={urlState.dataset}
                        activeDatasetMetric={urlState.metric}
                    />
                </div>

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