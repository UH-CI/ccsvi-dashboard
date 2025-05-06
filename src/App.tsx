import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import { Feature, Geometry, FeatureCollection } from 'geojson';
import { PathOptions } from 'leaflet';
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
    [key: string]: string | number;
}

type StyleFunction = (feature: Feature<Geometry, BlockGroupProperties> | undefined) => PathOptions;

const App: React.FC = () => {
    const [datasetConfig] = useState<DatasetConfig>(datasetParams.computers);

    const [geoData, setGeoData] = useState<FeatureCollection<Geometry, BlockGroupProperties> | null>(null);
    const [metricsData, setMetricsData] = useState<MetricsData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [showMetrics, setshowMetrics] = useState<boolean>(true);

    const getColor = (value: number): string => {
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

        const geoid = feature.properties[mapParams.geoidField];
        const metricValue = metricsData[geoid]?.[datasetConfig.metricName] || 0;

        return {
            fillColor: getColor(metricValue),
            weight: 0.5,
            opacity: 1,
            color: '#333',
            fillOpacity: 0.7
        };
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
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                />

                <button
                    onClick={() => setshowMetrics(!showMetrics)}
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
                    />
                )}
            </MapContainer>
        </div>
    );
};

export default App;