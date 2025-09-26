import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { Feature, Geometry } from 'geojson';
import L, { LeafletMouseEvent } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';
import styles from './App.module.scss';
import {
    BlockGroupProperties,
    HawaiianHomelandProperties,
} from './types';
import {
    createColorFunction,
    createGenericStyleFunction,
    CENSUS_STYLE_CONFIG,
    HOMELANDS_STYLE_CONFIG
} from './utils/mapStyling';
import { mapParams } from './config';
import { MapLegend } from './components/MapLegend';
import { ControlPanel } from './components/ControlPanel';
import { GenericPointMarkers } from './components/PointLayers/PointLayers.tsx';
import { GenericHazardLayer } from "./components/HazardLayers/GenericHazardLayer.tsx";
import { TableViewer } from './components/TableViewer';
import { GenericPolygonLayer } from './components/GenericPolygonLayer';
import { useMapSnapshot } from './hooks/useMapSnapshot';
import { usePointLayers } from "./hooks/usePointLayers.ts";
import { useGeometryLayers } from "./hooks/useGeometryLayers.ts"
import { useDataLoader } from './hooks/useDataLoader';
import { useAnimatedMapResize, MapResizeHandler } from './hooks/useMapResize';
import { useUrlState } from './hooks/useUrlState';

// Utility function for debouncing
function debounce<T extends (...args: never[]) => void>(func: T, wait: number): T {
    let timeout: NodeJS.Timeout;
    return ((...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    }) as T;
}

const MapComponent = ({
                          activeFeature,
                          onMapMove,
                          initialPosition
                      }: {
    activeFeature: Feature | null;
    onMapMove: (lat: number, lng: number, zoom: number) => void;
    initialPosition?: { lat: number; lng: number; zoom: number };
}) => {
    const map = useMap();
    const [hasInitialized, setHasInitialized] = useState(false);

    // Set initial position once
    useEffect(() => {
        if (initialPosition && !hasInitialized) {
            console.log('Setting initial map position from URL:', initialPosition);
            map.setView([initialPosition.lat, initialPosition.lng], initialPosition.zoom);
            setHasInitialized(true);
        }
    }, [initialPosition, hasInitialized, map]);

    // Handle active feature zoom
    useEffect(() => {
        if (activeFeature?.geometry) {
            const feature = L.geoJSON(activeFeature);
            const bounds = feature.getBounds();
            map.fitBounds(bounds);
        }
    }, [activeFeature, map]);

    // Debounced move handler
    const debouncedOnMove = useMemo(
        () => debounce((lat: number, lng: number, zoom: number) => {
            console.log('Map moved by user, updating URL:', { lat, lng, zoom });
            onMapMove(lat, lng, zoom);
        }, 500),
        [onMapMove]
    );

    useMapEvents({
        moveend: () => {
            const center = map.getCenter();
            const zoom = map.getZoom();
            debouncedOnMove(center.lat, center.lng, zoom);
        },
    });

    return null;
};

const App: React.FC = () => {
    // URL state management
    const { urlState, updateUrlState } = useUrlState();

    // Local UI state (non-shareable)
    const [activeFeature, setActiveFeature] = useState<Feature | null>(null);

    // Layer refs
    const layerRef = useRef<L.GeoJSON | null>(null);
    const homelandsLayerRef = useRef<L.GeoJSON | null>(null);
    const mapWrapperRef = useRef<HTMLDivElement>(null);

    // Custom hooks
    const {
        pointLayers,
        getCurrentVisibleLayerIds,
        isInitialized
    } = usePointLayers(urlState.pointLayers);

    const {
        hazardLayers,
        getCurrentVisibleLayerIds: getCurrentVisibleHazardLayerIds,
        isInitialized: isHazardInitialized,
    } = useGeometryLayers(urlState.hazardLayers ?? [])

    useEffect(() => {
        console.log('=== STATE DEBUG ===');
        console.log('URL pointLayers:', urlState.pointLayers);
        console.log('Local visible layers:', getCurrentVisibleLayerIds());
        console.log('isInitialized:', isInitialized);
        console.log('Point layers state:', pointLayers.map(l => ({ id: l.id, visible: l.visible })));
        console.log('==================');
    }, [urlState.pointLayers, pointLayers, isInitialized, getCurrentVisibleLayerIds]);

    useEffect(() => {
        console.log('=== STATE DEBUG ===');
        console.log('URL hazardLayers:', urlState.hazardLayers);
        console.log('Local visible layers:', getCurrentVisibleHazardLayerIds());
        console.log('isInitialized:', isHazardInitialized);
        console.log('Point layers state:', hazardLayers.map(l => ({ id: l.id, visible: l.visible })));
        console.log('==================');
    }, [urlState.hazardLayers, hazardLayers, isInitialized, getCurrentVisibleLayerIds]);

    const { mapRef, takeSnapshot } = useMapSnapshot();

    // Use the animated map resize hook
    const { animateResize } = useAnimatedMapResize({
        animationDuration: 300,
        updateInterval: 16,
    });

    // Use the data loader hook with URL state
    const {
        dataset,
        geoData,
        homelandsData,
        metricsData,
        loading,
        error,
        isInitialDataLoaded,
        hawaiianHomelands
    } = useDataLoader(urlState.dataset);

    // Derived state from loaded data
    const activeDatasetObject = useMemo(() => {
        if (!dataset || !urlState.dataset) return null;
        return dataset[urlState.dataset];
    }, [dataset, urlState.dataset]);

    const activeDatasetMetricObject = useMemo(() => {
        if (!activeDatasetObject || !urlState.metric) return null;
        return activeDatasetObject.columnThresholds[urlState.metric];
    }, [activeDatasetObject, urlState.metric]);

    // Validate metric when dataset changes
    useEffect(() => {
        if (dataset && urlState.dataset && dataset[urlState.dataset]?.columnThresholds) {
            const availableMetrics = Object.keys(dataset[urlState.dataset].columnThresholds);
            if (urlState.metric && !availableMetrics.includes(urlState.metric)) {
                updateUrlState({ metric: '' });
            }
        }
    }, [dataset, urlState.dataset, urlState.metric, updateUrlState]);

    // Color function
    const getColor = useMemo(() => {
        return createColorFunction(activeDatasetMetricObject);
    }, [activeDatasetMetricObject]);

    // Helper function to extract specific metrics
    const getMetricValue = useMemo(() => {
        if (!metricsData || !urlState.dataset || !urlState.metric) {
            return () => null;
        }

        const lookup = new Map<string, number>();
        Object.entries(metricsData).forEach(([geoid, data]) => {
            const value = data.metrics?.[urlState.dataset]?.[urlState.metric];
            if (value !== undefined && value !== null) {
                lookup.set(geoid, value);
            }
        });

        return (geoid: string): number | null => {
            if (!geoid) return null;
            return lookup.get(geoid) ?? null;
        };
    }, [metricsData, urlState.dataset, urlState.metric]);

    // Style functions
    const censusStyle = useMemo(() => {
        return createGenericStyleFunction<BlockGroupProperties>(
            getColor, 
            getMetricValue, 
            activeFeature, 
            'geoid20', 
            CENSUS_STYLE_CONFIG
        );
    }, [getColor, getMetricValue, activeFeature]);

    const homelandStyle = useMemo(() => {
        return createGenericStyleFunction<HawaiianHomelandProperties>(
            getColor, 
            getMetricValue, 
            activeFeature, 
            'GEOID10', 
            HOMELANDS_STYLE_CONFIG
        );
    }, [getColor, getMetricValue, activeFeature]);

    // Feature highlight handler
    function highlightFeature(e: LeafletMouseEvent) {
        const layer = e.target;
        const feature = layer.feature as Feature<Geometry, BlockGroupProperties | HawaiianHomelandProperties>;
        setActiveFeature(feature);
        layer.bringToFront();
    }

    // Handle table size changes with smooth animation
    const handleTableSizeChange = useCallback(() => {
        animateResize(mapRef);
    }, [animateResize, mapRef]);

    // Map events component
    const MapEvents = () => {
        const map = useMap();

        useEffect(() => {
            mapRef.current = map;
        }, [map]);

        useMapEvents({
            click: () => {
                setActiveFeature(null);
            },
        });
        return null;
    };

    // Handle map movement for URL updates (debounced)
    const handleMapMove = useCallback((lat: number, lng: number, zoom: number) => {
        updateUrlState({ lat, lng, zoom });
    }, [updateUrlState]);

    // Popup configurations
    const censusPopupConfig = {
        titleField: 'geoid20',
        fields: [
            { key: 'block_group', label: 'Block Group' },
            { key: 'census_tract', label: 'Census Tract' },
            { key: 'county', label: 'County' }
        ]
    };

    const homelandsPopupConfig = {
        titleField: 'NAME10',
        fields: [
            { key: 'GEOID10', label: 'Geo ID' }
        ]
    };

    // Layer reference handlers
    const onGeoJsonLoad = (layer: L.GeoJSON) => {
        layerRef.current = layer;
    };

    const onHomelandsLoad = (layer: L.GeoJSON) => {
        homelandsLayerRef.current = layer;
    };

    // Event handlers that update URL state
    const handleDatasetChange = (value: string) => {
        updateUrlState({ dataset: value, metric: '' });
        setActiveFeature(null);
    };

    const handleMetricChange = (value: string) => {
        updateUrlState({ metric: value });
    };

    const handlePointLayerToggle = (layerId: string) => {
        console.log('handlePointLayerToggle called for:', layerId);

        const currentVisible = urlState.pointLayers;
        const newVisible = currentVisible.includes(layerId)
            ? currentVisible.filter(id => id !== layerId)  // Remove if present
            : [...currentVisible, layerId];                // Add if not present

        console.log('Updating URL with new layers:', newVisible);
        updateUrlState({ pointLayers: newVisible });
    };

    const handleHazardLayerToggle = (layerId: string) => {
        console.log("handleHazardLayerToggle called for:", layerId);

        const currentVisible = urlState.hazardLayers ?? [];
        const newVisible = currentVisible.includes(layerId)
            ? currentVisible.filter(id => id !== layerId)
            : [...currentVisible, layerId];

        console.log('Updating URL with new layers:', newVisible);
        updateUrlState({ hazardLayers: newVisible });
    }

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

    // Determine initial map position
    const initialMapPosition =
        urlState.lat && urlState.lng && urlState.zoom
            ? { lat: urlState.lat, lng: urlState.lng, zoom: urlState.zoom }
            : undefined;

    const mapCenter: [number, number] = initialMapPosition
        ? [initialMapPosition.lat, initialMapPosition.lng]
        : mapParams.mapCenter;

    const mapZoom = initialMapPosition ? initialMapPosition.zoom : mapParams.mapZoom;

    // Main render
    return (
        <div className={styles['app-container']}>
            <div className={styles['map-section']}>
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
                    onSizeChange={handleTableSizeChange}
                />
            </div>

            <ControlPanel
                dataset={dataset}
                activeDataset={urlState.dataset}
                activeDatasetMetric={urlState.metric}
                onDatasetChange={handleDatasetChange}
                onMetricChange={handleMetricChange}
                pointLayers={pointLayers}
                hazardLayers={hazardLayers}
                togglePointLayer={handlePointLayerToggle}
                toggleHazardLayer={handleHazardLayerToggle}
                onTakeSnapshot={handleTakeSnapshot}
            />
        </div>
    );
};

export default App;