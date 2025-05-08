import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMapEvents } from 'react-leaflet';
import { Feature, Geometry, FeatureCollection } from 'geojson';
import L, { Layer, PathOptions, LeafletMouseEvent } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';
import styles from './App.module.scss'
import { mapParams, datasetParams } from './config';

interface MetricsData {
    [geoid: string]: {
        [metricName: string]: number;
    }
}

interface DatasetConfig {
    datasetPath: string;
    metricName: string;
    metricLabel: string;
    thresholds: number[];
    colors: string[];
}

interface BlockGroupProperties {
    objectid: number;
    geoid20: string;
    aland20: number;
    awater20: number;
    pop20: number;
    st_areasha: number;
    st_perimet: number;
}

type StyleFunction = (feature: Feature<Geometry, BlockGroupProperties> | undefined) => PathOptions;

const App: React.FC = () => {
    const [datasetConfig] = useState<DatasetConfig>(datasetParams.computers);
    const [geoData, setGeoData] = useState<FeatureCollection<Geometry, BlockGroupProperties> | null>(null);
    const [metricsData, setMetricsData] = useState<MetricsData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [showMetrics, setShowMetrics] = useState<boolean>(true);
    const [activeFeature, setActiveFeature] = useState<string | null>(null);
    const layerRef = useRef<L.GeoJSON | null>(null);

    const getColor = (value: number | null): string => {
        if (value === null) {
            return '#00FF00'
        }
        for (let i = 0; i < datasetConfig.thresholds.length; i++) {
            const threshold = datasetConfig.thresholds[i];

            if (value <= threshold) {
                return datasetConfig.colors[i];
            }
        }
        return '#333';
    };

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const geoResponse = await fetch(mapParams.geoJsonPath);
                const geoData = await geoResponse.json();
                setGeoData(geoData);

                const metricsResponse = await fetch(datasetConfig.datasetPath);
                const metricsData = await metricsResponse.json();
                setMetricsData(metricsData);
                setLoading(false);
            } catch (err) {
                console.error('Error loading data:', err);
                setLoading(false);
            }
        };

        loadData();
    }, [datasetConfig]);

    const style: StyleFunction = (feature) => {
        if (!feature || !metricsData || !datasetConfig) return {
            fillColor: '#cccccc',
            weight: 0.5,
            opacity: 1,
            color: '#333',
            fillOpacity: 0.3
        };

        const geoid = feature.properties.geoid20;
        const metricValue = metricsData[geoid]?.[datasetConfig.metricName] ?? null;
        const isActive = activeFeature === geoid;

        return {
            fillColor: getColor(metricValue),
            weight: isActive ? 1 : 0.5,
            opacity: 1,
            color: isActive ? '#000' : '#333',
            fillOpacity: isActive ? 0.8 : 0.5,
        };
    };

    function highlightFeature(e: LeafletMouseEvent) {
        const layer = e.target;
        const feature = layer.feature as Feature<Geometry, BlockGroupProperties>;
        const geoid = feature.properties.geoid20;

        setActiveFeature(geoid)
        layer.bringToFront();
    }

    function removeHighlight() {
        setActiveFeature(null);
    }

    const MapEvents = () => {
        useMapEvents({
            click: () => {
                removeHighlight();
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
        const metricValue = metricsData[geoid]?.[datasetConfig.metricName] ?? null;

        layer.on({
            click: highlightFeature,
        })

        if ('bindPopup' in layer) {
            layer.bindPopup(`
                <div>
                    <b>Block Group ID:</b> ${geoid}<br>
                    <b>${datasetConfig.metricLabel}:</b> ${metricValue}
                </div>
            `);
        }
    };

    const legendLevels = () => {
        if (!datasetConfig) return [];

        const items = [];
        for (let i = datasetConfig.thresholds.length - 1; i >= 0; i--) {
            const low = datasetConfig.thresholds[i];
            const high = datasetConfig.thresholds[i + 1];

            let label;
            if (i === datasetConfig.thresholds.length - 1) {
                label = `> ${low}`;
            } else if (i === 0) {
                label = `${low}`;
            } else {
                label = `${low}-${high - 1}`;
            }

            items.push(
                <div key={i} className={styles.legend__item}>
                    <div
                        className={styles['legend__item-color']}
                        style={{ backgroundColor: datasetConfig.colors[i] }}
                    ></div>
                    <span>{label}</span>
                </div>
            );
        }
        return items;
    };

    const onGeoJsonLoad = (layer: L.GeoJSON) => {
        layerRef.current = layer;
    }

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div style={{ height: '100vh', width: '100%' }}>
            <MapContainer
                center={mapParams.mapCenter}
                zoom={mapParams.mapZoom}
                minZoom={mapParams.minZoom}
                maxBounds={mapParams.maxBounds}
                maxBoundsViscosity={mapParams.maxBoundsViscosity}
                style={{ height: '100%', width: '100%' }}
            >
                <MapEvents/>
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                />

                <button
                    onClick={() => setShowMetrics(!showMetrics)}
                    style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 1000 }}
                >
                    {showMetrics ? 'Hide' : 'Show'} Heatmap
                </button>

                {datasetConfig && (
                    <div className={styles.legend}>
                        <div className={styles.legend__title}>{datasetConfig.metricLabel}</div>
                        <div className={styles.legend__items}>
                            {legendLevels()}
                        </div>
                    </div>
                )}

                {geoData && metricsData && datasetConfig && showMetrics && (
                    <GeoJSON
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
            </MapContainer>
        </div>
    );
};

export default App;