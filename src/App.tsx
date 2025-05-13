import React, { useEffect, useState, useRef } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap, useMapEvents } from 'react-leaflet';
import { Feature, Geometry, FeatureCollection } from 'geojson';
import L, { Layer, PathOptions, LeafletMouseEvent } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';
import styles from './App.module.scss'
import { mapParams, datasetParams } from './config';


interface MetricsData {
    [geoid: string]: {
        metrics: {
            [metricName: string]: number;
        };
        geoinfo: {
            blockGroup: string;
            censusTract: string;
            county: string;
        }
    }
}

interface DatasetConfig {
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
    const [activeDataset, setActiveDataset] = useState<string>('computers');
    // const [datasetConfig, setDatasetConfig] = useState<DatasetConfig>(datasetParams.computers);
    const [geoData, setGeoData] = useState<FeatureCollection<Geometry, BlockGroupProperties> | null>(null);
    const [metricsData, setMetricsData] = useState<MetricsData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [showMetrics, setShowMetrics] = useState<boolean>(true);
    const [activeFeature, setActiveFeature] = useState<Feature | null>(null);
    const layerRef = useRef<L.GeoJSON | null>(null);


    // const getDatasetConfig = (key: string): DatasetConfig => {
    //     // Check if the key exists in datasetParams
    //     if (key in datasetParams) {
    //         return datasetParams[key as keyof typeof datasetParams];
    //     }
    //
    //     // Fallback to first dataset if key not found
    //     console.warn(`Dataset key "${key}" not found, using default dataset`);
    //     const firstDatasetKey = Object.keys(datasetParams)[0];
    //     return datasetParams[firstDatasetKey as keyof typeof datasetParams];
    // };
    //
    // const datasetConfig = getDatasetConfig(activeDataset);

    const datasetConfig: DatasetConfig = datasetParams[activeDataset as keyof typeof datasetParams];

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

    // useEffect(() => {
    //     if (datasetParams[activeDataset]) {
    //         setDatasetConfig(datasetParams[activeDataset as string]);
    //     }
    // }, []);

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
                setLoading(false);
            } catch (err) {
                console.error('Error loading data:', err);
                setLoading(false);
            }
        };

        loadData();
    }, []);

    const style: StyleFunction = (feature) => {
        if (!feature || !metricsData || !datasetConfig) return {
            fillColor: '#cccccc',
            weight: 0.5,
            opacity: 1,
            color: '#333',
            fillOpacity: 0.3
        };

        const geoid = feature.properties.geoid20;
        const metricValue = metricsData[geoid]?.metrics?.[datasetConfig.metricName] ?? null;
        const isActive = activeFeature?.properties?.geoid20 === geoid;

        return {
            fillColor: getColor(metricValue),
            weight: isActive ? 3 : 1,
            opacity: 1,
            color: isActive ? '#000' : '#333',
            fillOpacity: isActive ? 0.8 : 0.5,
        };
    };

    function highlightFeature(e: LeafletMouseEvent) {
        const layer = e.target;
        const feature = layer.feature as Feature<Geometry, BlockGroupProperties>;

        setActiveFeature(feature)
        layer.bringToFront();
    }

    // function removeHighlight() {
    //     setActiveFeature(null);
    // }

    const MapEvents = () => {
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
        const metricValue = metricsData[geoid]?.metrics?.[datasetConfig.metricName] ?? null;

        layer.on({
            click: highlightFeature,
        })

        if ('bindPopup' in layer) {
            layer.bindPopup(`
    <div>
        <b>Block Group ID:</b> ${geoid}<br>
        <b>Block Group:</b> ${metricsData[geoid]?.geoinfo?.blockGroup ?? 'N/A'}<br>
        <b>Census Tract:</b> ${metricsData[geoid]?.geoinfo?.censusTract ?? 'N/A'}<br>
        <b>County:</b> ${metricsData[geoid]?.geoinfo?.county ?? 'N/A'}<br>
        <b>${datasetConfig.metricLabel}:</b> ${metricValue ?? 'N/A'}
    </div>
`);
        }
    };

    // const featureData = () => {
    //     if (!activeFeature) return;
    //
    //     const geoid = activeFeature?.properties?.geoid20;
    //     const blockData = metricsData?.[geoid];
    //
    //     return(
    //         <div className={styles['data-selector__item']}>
    //             <span>ID: {activeFeature.id}</span>
    //             <span>ID: {geoid}</span>
    //             <span>{datasetConfig.metricLabel}: {blockData?.[datasetConfig.metricName] ?? 'N/A'}</span>
    //         </div>
    //     );
    // };

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

    const getDatasets = () => {
        return Object.entries(datasetParams).map(([key, config]) => ({
            id: key,
            label: config.metricLabel
        }));
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
                <MapEvents/>
                {activeFeature && <MapComponent activeFeature={activeFeature}/>}
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                />

                <div className={styles.controls}>
                    <h2>Controls</h2>
                    <button
                        onClick={() => setShowMetrics(!showMetrics)}
                    >
                        {showMetrics ? 'Hide' : 'Show'} Heatmap
                    </button>

                    <select
                        value={activeDataset}
                        onChange={(e) => setActiveDataset(e.target.value)}
                        style={{ padding: '5px' }}
                    >
                        {getDatasets().map(dataset => (
                            <option key={dataset.id} value={dataset.id}>
                                {dataset.label}
                            </option>
                        ))}
                    </select>
                </div>

                {datasetConfig && (
                    <div>
                        {/*<div className={styles['data-selector']}>*/}
                        {/*    <div className={styles['data-selector__title']}>Feature</div>*/}
                        {/*    <div className={styles['data-selector__items']}>*/}
                        {/*        {featureData()}*/}
                        {/*    </div>*/}
                        {/*</div>*/}
                        <div className={styles.legend}>
                            <div className={styles.legend__title}>{datasetConfig.metricLabel}</div>
                            <div className={styles.legend__items}>
                                {legendLevels()}
                            </div>
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