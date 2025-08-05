import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap, useMapEvents } from 'react-leaflet';
import { Feature, Geometry } from 'geojson';
import L, { Layer, LeafletMouseEvent } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';
import {
    BlockGroupProperties,
    HawaiianHomelandProperties,
} from './types';
import {
    createColorFunction,
    createCensusStyleFunction,
    createHomelandsStyleFunction
} from './utils/mapStyling';
import { mapParams } from './config';
import { MapLegend } from './components/MapLegend';
import { ControlPanel } from './components/ControlPanel';
import { GenericPointMarkers } from './components/PointLayers/PointLayers.tsx';
import { TableViewer } from './components/TableViewer';
import { useMapSnapshot } from './hooks/useMapSnapshot';
import { usePointLayers } from "./hooks/usePointLayers.ts";
import { useDataLoader } from './hooks/useDataLoader';

const MapComponent = ({activeFeature}: {activeFeature: Feature | null}) => {
    const map = useMap();

    useEffect(() => {
        if (activeFeature && activeFeature.geometry) {
            const feature = L.geoJSON(activeFeature);
            const bounds = feature.getBounds();
            map.fitBounds(bounds);
        }
    }, [activeFeature, map]);
    return null;
};

const App: React.FC = () => {
    // Dataset state
    const [activeDataset, setActiveDataset] = useState<string>('');
    const [activeDatasetMetric, setActiveDatasetMetric] = useState<string>('');
    const [activeFeature, setActiveFeature] = useState<Feature | null>(null);

    // Layer refs
    const layerRef = useRef<L.GeoJSON | null>(null);
    const homelandsLayerRef = useRef<L.GeoJSON | null>(null);

    // Custom hooks
    const { pointLayers, togglePointLayer } = usePointLayers();
    const { mapRef, takeSnapshot } = useMapSnapshot();

    // Use the data loader hook
    const {
        dataset,
        geoData,
        homelandsData,
        metricsData,
        loading,
        error,
        isInitialDataLoaded,
        hawaiianHomelands
    } = useDataLoader(activeDataset);

    // Derived state from loaded data
    const activeDatasetObject = useMemo(() => {
        if (!dataset || !activeDataset) return null;
        console.log("activeDatasetObject: ", dataset[activeDataset]);
        return dataset[activeDataset];
    }, [dataset, activeDataset]);

    const activeDatasetMetricObject = useMemo(() => {
        if (!activeDatasetObject || !activeDatasetMetric) return null;
        console.log("activeDatasetMetricObject: ", activeDatasetObject.columnThresholds[activeDatasetMetric]);
        return activeDatasetObject.columnThresholds[activeDatasetMetric];
    }, [activeDatasetObject, activeDatasetMetric]);

    // Validate metric when dataset changes
    useEffect(() => {
        if (dataset && activeDataset && dataset[activeDataset]?.columnThresholds) {
            const availableMetrics = Object.keys(dataset[activeDataset].columnThresholds);
            if (activeDatasetMetric && !availableMetrics.includes(activeDatasetMetric)) {
                setActiveDatasetMetric('');
            }
        }
    }, [dataset, activeDataset, activeDatasetMetric]);

    // Color function
    const getColor = useMemo(() => {
        return createColorFunction(activeDatasetMetricObject);
    }, [activeDatasetMetricObject]);

    // Helper function to extract specific metrics
    const getMetricValue = useMemo(() => {
        if (!metricsData || !activeDataset || !activeDatasetMetric) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            return (_geoid: string) => null;
        }

        const lookup = new Map<string, number>();
        Object.entries(metricsData).forEach(([geoid, data]) => {
            const value = data.metrics?.[activeDataset]?.[activeDatasetMetric];
            if (value !== undefined && value !== null) {
                lookup.set(geoid, value);
            }
        });

        return (geoid: string): number | null => {
            if (!geoid) return null;
            return lookup.get(geoid) ?? null;
        };
    }, [metricsData, activeDataset, activeDatasetMetric]);

    // Style function for census features
    const style = useMemo(() => {
        return createCensusStyleFunction(getColor, getMetricValue, activeFeature);
    }, [getColor, getMetricValue, activeFeature]);

    const homelandStyle = useMemo(() => {
        return createHomelandsStyleFunction(getColor, getMetricValue, activeFeature);
    }, [getColor, getMetricValue, activeFeature]);

    // Feature highlight handler
    function highlightFeature(e: LeafletMouseEvent) {
        const layer = e.target;
        const feature = layer.feature as Feature<Geometry, BlockGroupProperties | HawaiianHomelandProperties>;
        setActiveFeature(feature)
        layer.bringToFront();
    }

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

    // Feature handlers
    const onEachFeature = (
        feature: Feature<Geometry, BlockGroupProperties>,
        layer: Layer
    ): void => {
        if (!metricsData) return;

        const geoid = feature.properties.geoid20;
        const metricValue = getMetricValue(geoid)

        layer.on({
            click: highlightFeature,
        })

        if ('bindPopup' in layer) {
            layer.bindPopup(`
                <div>
                    <b>Block Group ID:</b> ${geoid}<br>
                    <b>Block Group:</b> ${metricsData[geoid]?.block_group ?? 'N/A'}<br>
                    <b>Census Tract:</b> ${metricsData[geoid]?.census_tract ?? 'N/A'}<br>
                    <b>County:</b> ${metricsData[geoid]?.county ?? 'N/A'}<br>
                    <b>${activeDatasetMetric}:</b> ${metricValue ?? 'N/A'}
                </div>
            `);
        }
    };

    const onEachHomelandFeature = (
        feature: Feature<Geometry, HawaiianHomelandProperties>,
        layer: Layer
    ): void => {
        layer.on({
            click: highlightFeature,
        })

        const geoid = feature.properties.GEOID10;
        const metricValue = getMetricValue(geoid);

        if ('bindPopup' in layer) {
            layer.bindPopup(`
                <div>
                    <b>Hawaiian Homeland:</b> ${feature.properties.NAME10}<br>
                    <b>Geo ID:</b> ${feature.properties.GEOID10}<br>
                    ${activeDatasetMetric ? `<b>${activeDatasetMetric}:</b> ${metricValue ?? 'N/A'}` : ''}
                </div>
            `);
        }
    };

    // Layer reference handlers
    const onGeoJsonLoad = (layer: L.GeoJSON) => {
        layerRef.current = layer;
    }

    const onHomelandsLoad = (layer: L.GeoJSON) => {
        homelandsLayerRef.current = layer;
    }

    // Event handlers
    const handleDatasetChange = (value: string) => {
        setActiveDataset(value);
        setActiveDatasetMetric('');
        setActiveFeature(null);
    };

    const handleMetricChange = (value: string) => {
        setActiveDatasetMetric(value);
    };

    // Snapshot handler
    const handleTakeSnapshot = useCallback(async () => {
        try {
            await takeSnapshot({
                activeDataset,
                activeDatasetMetric,
                customPrefix: 'hawaii-census-map'
            });
        } catch (error) {
            console.error('Snapshot error:', error);
            alert('Failed to take snapshot. Please try again.');
        }
    }, [takeSnapshot, activeDataset, activeDatasetMetric]);

    // Error handling
    if (error) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                flexDirection: 'column',
                gap: '1rem'
            }}>
                <h2>Error loading data</h2>
                <p>{error}</p>
                <button onClick={() => window.location.reload()}>
                    Retry
                </button>
            </div>
        );
    }

    // Loading state for Hawaiian Homelands data
    if (loading || !isInitialDataLoaded) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
                flexDirection: 'column',
                gap: '1rem'
            }}>
                <div>Loading data...</div>
                {hawaiianHomelands && !homelandsData && (
                    <div style={{ fontSize: '0.9em', opacity: 0.7 }}>
                        Loading Hawaiian Homelands data...
                    </div>
                )}
            </div>
        );
    }

    // Main render
    return (
        <div style={{
            height: '100vh',
            width: '100%',
            display: 'flex',
            overflow: 'hidden'
        }}>
            <div style={{
                flex: '1 1 auto',
                minWidth: 0,
                height: '100%',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column'
            }}>
                <div style={{
                    flex: '1 1 auto',
                    position: 'relative',
                    minHeight: 0,
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <MapContainer
                        center={mapParams.mapCenter}
                        zoom={mapParams.mapZoom}
                        minZoom={mapParams.minZoom}
                        maxBounds={mapParams.maxBounds}
                        maxBoundsViscosity={mapParams.maxBoundsViscosity}
                        style={{ height: '100%', width: '100%' }}
                    >
                        <MapEvents/>
                        {activeFeature && <MapComponent activeFeature={activeFeature}/>}
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='&copy; OpenStreetMap contributors'
                        />
                        {geoData && metricsData && dataset && (
                            <GeoJSON
                                key={`geojson-${activeDataset}-${activeDatasetMetric}`}
                                data={geoData}
                                style={style}
                                onEachFeature={onEachFeature}
                                ref={onGeoJsonLoad}
                                eventHandlers={{
                                    click: (e) => {
                                        e.originalEvent.stopPropagation();
                                    }
                                }}
                            />
                        )}
                        {hawaiianHomelands && homelandsData && (
                            <GeoJSON
                                key={`homelands-${activeDataset}-${activeDatasetMetric}`}
                                data={homelandsData}
                                style={homelandStyle}
                                onEachFeature={onEachHomelandFeature}
                                ref={onHomelandsLoad}
                                eventHandlers={{
                                    click: (e) => {
                                        e.originalEvent.stopPropagation();
                                    }
                                }}
                            />
                        )}
                        {pointLayers.map(layer => (
                            <GenericPointMarkers key={layer.id} layer={layer} />
                        ))}
                    </MapContainer>

                    <MapLegend
                        dataset={dataset}
                        activeDataset={activeDataset}
                        activeDatasetMetric={activeDatasetMetric}
                    />
                </div>

                <TableViewer
                    activeDataset={activeDataset}
                    datasetInfo={activeDatasetObject}
                />
            </div>

            <ControlPanel
                dataset={dataset}
                activeDataset={activeDataset}
                activeDatasetMetric={activeDatasetMetric}
                onDatasetChange={handleDatasetChange}
                onMetricChange={handleMetricChange}
                pointLayers={pointLayers}
                togglePointLayer={togglePointLayer}
                onTakeSnapshot={handleTakeSnapshot}
            />
        </div>
    );
};

export default App;