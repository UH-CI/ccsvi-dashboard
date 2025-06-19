import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap, useMapEvents } from 'react-leaflet';
import { Feature, Geometry, FeatureCollection } from 'geojson';
import L, { Layer, PathOptions, LeafletMouseEvent } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';
import styles from './App.module.scss'
import { mapParams } from './config';


interface MetricsData {
    [geoid: string]: {
        geoinfo: {
            blockGroup: string;
            censusTract: string;
            county: string;
        };
        metrics: {
            [datasetName: string]: {
                [metricName: string]: number;
            }
        };
    }
}

interface Dataset {
    [key: string]: {
        metricName: string;
        metricLabel: string;
        columnThresholds: {
            [columnName: string]: {
                thresholds: number[];
                colors: string[];
            }
        }
    }
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
    const [dataset, setDataset] = useState<Dataset | null>(null);
    const [activeDataset, setActiveDataset] = useState<string>('');
    const [activeDatasetMetric, setActiveDatasetMetric] = useState<string>('');
    const [geoData, setGeoData] = useState<FeatureCollection<Geometry, BlockGroupProperties> | null>(null);
    const [metricsData, setMetricsData] = useState<MetricsData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [showMetrics, setShowMetrics] = useState<boolean>(true);
    const [activeFeature, setActiveFeature] = useState<Feature | null>(null);
    const layerRef = useRef<L.GeoJSON | null>(null);

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

    const getColor = useCallback((value: number | null): string => {
        if (value === null || !activeDatasetMetricObject) {
            return '#00FF00';
        }

        for (let i = 0; i < activeDatasetMetricObject.thresholds?.length; i++) {
            const threshold = activeDatasetMetricObject.thresholds[i];
            if (value <= threshold) {
                return activeDatasetMetricObject.colors[i];
            }
        }
        return '#333';
    }, [activeDatasetMetricObject]);

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

                // Check if active metric is valid in current dataset. Else set to empty.
                if (activeDataset && datasetData[activeDataset]?.columnThresholds) {
                    const availableMetrics = Object.keys(datasetData[activeDataset].columnThresholds);
                    if (activeDatasetMetric && !availableMetrics.includes(activeDatasetMetric)) {
                        setActiveDatasetMetric('');
                    }
                }

                setLoading(false);
            } catch (err) {
                console.error('Error loading data:', err);
                setLoading(false);
            }
        };

        loadData();
    }, []);

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

    const style: StyleFunction = useCallback((feature) => {
        // console.log("feature: ", feature);
        // console.log("metricsData: ", metricsData);
        // console.log("activeDataset: ", activeDataset);
        // console.log("activeDatasetMetric: ", activeDatasetMetric);
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

    function highlightFeature(e: LeafletMouseEvent) {
        const layer = e.target;
        const feature = layer.feature as Feature<Geometry, BlockGroupProperties>;

        setActiveFeature(feature)
        layer.bringToFront();
    }

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
        const metricValue = getMetricValue(geoid)
        // const datasetObject = getActiveDatasetObject()

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
                    <b>${activeDatasetObject?.metricLabel}:</b> ${metricValue ?? 'N/A'}
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
        if (!activeDatasetMetricObject) return [];

        const items = [];
        for (let i = activeDatasetMetricObject.thresholds.length - 1; i >= 0; i--) {
            const low = activeDatasetMetricObject.thresholds[i];
            const high = activeDatasetMetricObject.thresholds[i + 1];

            let label;
            if (i === activeDatasetMetricObject.thresholds.length - 1) {
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
                        style={{ backgroundColor: activeDatasetMetricObject.colors[i] }}
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
        if (!dataset) {
            console.log("getDatasets: no dataset")
            return []
        }
        return Object.entries(dataset).map(([key, config]) => ({
            id: key,
            label: config.metricLabel || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) // Convert snake case to title case
        }));
    };

    const getColumns = () => {
        if (!dataset || !activeDataset) return [];

        const datasetObject = dataset[activeDataset];
        if (!datasetObject || !datasetObject.columnThresholds) return [];

        return Object.keys(datasetObject.columnThresholds).map(columnName => ({
            id: columnName,
            label: columnName
        }));
    }

    const handleDatasetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newDataset = e.target.value;
        setActiveDataset(newDataset);
        setActiveDatasetMetric('');
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
                        onChange={handleDatasetChange}
                        style={{ padding: '5px' }}
                    >
                        <option value="">Select Dataset </option>
                        {getDatasets().map(dataset => (
                            <option key={dataset.id} value={dataset.id}>
                                {dataset.label}
                            </option>
                        ))}
                    </select>
                    {activeDataset && (
                        <select
                            value={activeDatasetMetric}
                            onChange={(e) => setActiveDatasetMetric(e.target.value)}
                            style={{ padding: '5px' }}
                        >
                            <option value="">Select Metric</option>
                            {getColumns().map(dataset => (
                                <option key={dataset.id} value={dataset.id}>
                                    {dataset.label}
                                </option>
                            ))}
                        </select>
                    )

                    }
                </div>

                {dataset && activeDataset && (
                    <div>
                        {/*<div className={styles['data-selector']}>*/}
                        {/*    <div className={styles['data-selector__title']}>Feature</div>*/}
                        {/*    <div className={styles['data-selector__items']}>*/}
                        {/*        {featureData()}*/}
                        {/*    </div>*/}
                        {/*</div>*/}
                        <div className={styles.legend}>
                            <div className={styles.legend__title}>{activeDatasetObject?.metricLabel}</div>
                            <div className={styles.legend__items}>
                                {legendLevels()}
                            </div>
                        </div>
                    </div>
                )}

                {geoData && metricsData && dataset && showMetrics && (
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