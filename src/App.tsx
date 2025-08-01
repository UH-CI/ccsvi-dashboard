import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap, useMapEvents } from 'react-leaflet';
import { Feature, Geometry, FeatureCollection } from 'geojson';
import L, { Layer, LeafletMouseEvent } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';
import {
    MetricsData,
    Dataset,
    BlockGroupProperties,
    HawaiianHomelandProperties,
    StyleFunction,
    HomelandsStyleFunction
} from './types';
import { mapParams } from './config';
import { MapLegend } from './components/MapLegend';
import { ControlPanel } from './components/ControlPanel';
import { GenericPointMarkers } from './components/PointLayers/PointLayers.tsx';
import { TableViewer } from './components/TableViewer';
import { useMapSnapshot } from './hooks/useMapSnapshot';
import { usePointLayers } from "./hooks/usePointLayers.ts";

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
    const [dataset, setDataset] = useState<Dataset | null>(null);
    const [activeDataset, setActiveDataset] = useState<string>('');
    const [activeDatasetMetric, setActiveDatasetMetric] = useState<string>('');
    const [geoData, setGeoData] = useState<FeatureCollection<Geometry, BlockGroupProperties> | null>(null);
    const [homelandsData, setHomelandsData] = useState<FeatureCollection<Geometry, HawaiianHomelandProperties> | null>(null);
    const [metricsData, setMetricsData] = useState<MetricsData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [activeFeature, setActiveFeature] = useState<Feature | null>(null);
    const layerRef = useRef<L.GeoJSON | null>(null);
    const homelandsLayerRef = useRef<L.GeoJSON | null>(null);

    const { pointLayers, togglePointLayer } = usePointLayers();
    const { mapRef, takeSnapshot } = useMapSnapshot();

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

    const hawaiianHomelands = useMemo(() => {
        return activeDatasetObject?.hawaiianHomelands || false;
    }, [activeDatasetObject]);

    const getColor = useCallback((value: number | null): string => {
        if (value === null || !activeDatasetMetricObject) {
            return '#cccccc';
        }

        for (let i = 0; i < activeDatasetMetricObject.thresholds?.length; i++) {
            const threshold = activeDatasetMetricObject.thresholds[i];
            if (value <= threshold) {
                return activeDatasetMetricObject.colors[i];
            }
        }
        return '#333';
    }, [activeDatasetMetricObject]);

    // Snapshot handler with error handling
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

    // Load Hawaiian Homelands data when needed
    useEffect(() => {
        const loadHomelandsData = async () => {
            if (!hawaiianHomelands) {
                setHomelandsData(null);
                return;
            }
            if (homelandsData) return;
            try {
                const response = await fetch('./data/Census_Hawaiian_Homelands_hhl10.geojson');
                const data = await response.json();
                setHomelandsData(data);
            } catch (err) {
                console.error('Error loading Hawaiian Homelands data:', err);
            }
        };
        loadHomelandsData();
    }, [hawaiianHomelands, homelandsData]);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);

            try {
                const geoResponse = await fetch(mapParams.geoJsonPath);
                const geoData = await geoResponse.json();
                setGeoData(geoData);

                const metricsResponse = await fetch(mapParams.datasetPath);
                const metricsData = await metricsResponse.json();
                setMetricsData(metricsData);

                const datasetResponse = await fetch('./data/metrics/census_datasets_info.json');
                const datasetData = await datasetResponse.json();
                setDataset(datasetData)

                setLoading(false);
            } catch (err) {
                console.error('Error loading data:', err);
                setLoading(false);
            }
        };

        loadData();
    }, []);

    useEffect(() => {
        if (dataset && activeDataset && dataset[activeDataset]?.columnThresholds) {
            const availableMetrics = Object.keys(dataset[activeDataset].columnThresholds);
            if (activeDatasetMetric && !availableMetrics.includes(activeDatasetMetric)) {
                setActiveDatasetMetric('');
            }
        }
    }, [dataset, activeDataset, activeDatasetMetric]);

    // Helper function to extract specific metrics given current census data json structure
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

    // Style function for state census features
    const style: StyleFunction = useCallback((feature) => {
        if (!feature || !activeDatasetMetricObject) {
            return {
                fillColor: '#cccccc',
                weight: 0.5,
                opacity: 1,
                color: '#333',
                fillOpacity: 0.3
            };
        }

        const geoid = feature.properties.geoid20;
        const metricValue = getMetricValue(geoid);
        const isActive = activeFeature?.properties?.geoid20 === geoid;

        return {
            fillColor: getColor(metricValue),
            weight: isActive ? 3 : 1,
            opacity: 1,
            color: isActive ? '#000' : '#333',
            fillOpacity: isActive ? 0.8 : 0.5,
        };
    }, [activeDatasetMetricObject, getMetricValue, getColor, activeFeature]);

    // Style function for Hawaiian Homelands
    const homelandStyle: HomelandsStyleFunction = useCallback((feature) => {
        if (!feature) {
            return {
                fillColor: '#cccccc',
                weight: 0.5,
                opacity: 1,
                color: '#333',
                fillOpacity: 0.3
            };
        }
        const geoid = feature.properties.GEOID10;
        const metricValue = getMetricValue(geoid);
        const isActive = activeFeature?.properties?.GEOID10 === feature.properties.GEOID10;

        return {
            fillColor: getColor(metricValue),
            weight: isActive ? 3 : 1,
            opacity: 1,
            color: isActive ? '#654321' : '#8B4513',
            fillOpacity: isActive ? 0.8 : 0.5,
        };
    }, [getMetricValue, getColor, activeFeature]);

    function highlightFeature(e: LeafletMouseEvent) {
        const layer = e.target;
        const feature = layer.feature as Feature<Geometry, BlockGroupProperties | HawaiianHomelandProperties>;
        setActiveFeature(feature)
        layer.bringToFront();
    }

    const MapEvents = () => {
        const map = useMap();

        // Store map reference for snapshot
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
                    <b>${activeDatasetObject?.metricLabel}:</b> ${metricValue ?? 'N/A'}
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
                    ${activeDatasetObject?.metricLabel ? `<b>${activeDatasetObject.metricLabel}:</b> ${metricValue ?? 'N/A'}` : ''}
                </div>
            `);
        }
    };

    const onGeoJsonLoad = (layer: L.GeoJSON) => {
        layerRef.current = layer;
    }

    const onHomelandsLoad = (layer: L.GeoJSON) => {
        homelandsLayerRef.current = layer;
    }

    const handleDatasetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newDataset = e.target.value;
        setActiveDataset(newDataset);
        setActiveDatasetMetric('');
        setActiveFeature(null);
    };

    const handleMetricChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setActiveDatasetMetric(e.target.value);
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div style={{ height: '100vh', width: '100%', display: 'flex' }}>
            <div style={{ flex: 1, height: '100%', position: 'relative'}}>
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

                {/* Add the DataTableViewer component here */}
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