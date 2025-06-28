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
        hawaiianHomelands?: boolean;
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

interface HawaiianHomelandProperties {
    AIANNHCE10: string;
    AIANNHNS10: string;
    GEOID10: string;
    NAME10: string;
    AIANNHFP10: string;
    POP10: number;
    Shape_Leng: number;
    Shape_Area: number;
}

type StyleFunction = (feature: Feature<Geometry, BlockGroupProperties> | undefined) => PathOptions;

type HomelandStyleFunction = (feature: Feature<Geometry, HawaiianHomelandProperties> | undefined) => PathOptions;

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
    // const [showMetrics, setShowMetrics] = useState<boolean>(true);
    const [activeFeature, setActiveFeature] = useState<Feature | null>(null);
    const layerRef = useRef<L.GeoJSON | null>(null);
    const homelandsLayerRef = useRef<L.GeoJSON | null>(null);

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

    // Style function for state census features
    const style: StyleFunction = useCallback((feature) => {
        console.log("StyleFunction")
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

    // Style function for Hawaiian Homelands
    const homelandStyle: HomelandStyleFunction = useCallback((feature) => {
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
    }, [activeDatasetMetricObject, getMetricValue, getColor, activeFeature]);


    function highlightFeature(e: LeafletMouseEvent) {
        const layer = e.target;
        const feature = layer.feature as Feature<Geometry, BlockGroupProperties | HawaiianHomelandProperties>;
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
    const legendLevels = useMemo(() => {
        console.log("legendLevels")
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
    }, [activeDatasetMetricObject]);

    const onGeoJsonLoad = (layer: L.GeoJSON) => {
        layerRef.current = layer;
    }

    const onHomelandsLoad = (layer: L.GeoJSON) => {
        homelandsLayerRef.current = layer;
    }


    const datasetList = useMemo(() => {
        console.log("getDatasets")
        if (!dataset) {
            console.log("getDatasets: no dataset")
            return []
        }
        return Object.entries(dataset).map(([key, config]) => ({
            id: key,
            label: config.metricLabel || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            hawaiianHomelands: config.hawaiianHomelands || false
        }));
    }, [dataset]);

    const datasetMetrics = useMemo(() => {
        console.log("getMetrics")
        if (!dataset || !activeDataset) return [];

        const datasetObject = dataset[activeDataset];
        if (!datasetObject?.columnThresholds) return [];

        return Object.keys(datasetObject.columnThresholds).map(columnName => ({
            id: columnName,
            label: columnName
        }));
    }, [dataset, activeDataset]);

    const handleDatasetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newDataset = e.target.value;
        setActiveDataset(newDataset);
        setActiveDatasetMetric('');
        setActiveFeature(null);
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
                    {/* Census Block Groups Layer */}
                    {geoData && metricsData && dataset && (
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
                    {/* Hawaiian Homelands Layer - Only when needed */}
                    {hawaiianHomelands && homelandsData && (
                        <GeoJSON
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
                </MapContainer>

                {dataset && activeDataset && activeDatasetMetric && (
                    <div className={styles.legend}>
                        {/*<div className={styles.legend__title}>{activeDatasetMetric}</div>*/}
                        <div className={styles.legend__items}>
                            {legendLevels}
                        </div>
                    </div>
                )}
            </div>


            <div className={styles['control-panel']}>
                <h2>Controls</h2>
                <div>
                    <select
                        value={activeDataset}
                        onChange={handleDatasetChange}
                        style={{ padding: '5px' }}
                    >
                        <option value="">Select Dataset </option>
                        {datasetList.map(dataset => (
                            <option key={dataset.id} value={dataset.id}>
                                {dataset.label}
                            </option>
                        ))}
                    </select>
                </div>
                {activeDataset && (
                    <div>
                        <select
                            value={activeDatasetMetric}
                            onChange={(e) => setActiveDatasetMetric(e.target.value)}
                            style={{ padding: '5px' }}
                        >
                            <option value="">Select Metric</option>
                            {datasetMetrics.map(metric => (
                                <option key={metric.id} value={metric.id}>
                                    {metric.label}
                                </option>
                            ))}
                        </select>
                    </div>
                )
                }
            </div>
        </div>
    );
};

export default App;