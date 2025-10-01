import React, { useMemo, useCallback, useRef, useEffect, memo } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { FeatureCollection, Geometry } from 'geojson';
import L, { LeafletMouseEvent } from 'leaflet';
import {
    MapConfig,
    MetricsData,
    Dataset,
    BlockGroupProperties,
    HawaiianHomelandProperties,
    PointLayerConfig
} from '../../types';
import { GenericPolygonLayer } from '../GenericPolygonLayer';
import { GenericPointMarkers } from '../PointLayers/PointLayers';
import { MapLegend } from '../MapLegend';
import { MAP_CONFIG, POLYGON_LAYERS} from "../../config";
import styles from './SingleMapView.module.scss';

interface SingleMapViewProps {
    config: MapConfig;
    isPrimary: boolean;
    mapConfigsLength: number;
    // Shared data (already loaded - passed as props)
    dataset: Dataset | null;
    metricsData: MetricsData | null;
    censusBlockPolygons: FeatureCollection<Geometry, BlockGroupProperties> | null;
    hawaiianHomelandPolygons: FeatureCollection<Geometry, HawaiianHomelandProperties> | null;
    pointLayers: PointLayerConfig[];
    // Handlers
    onUpdateActiveFeature?: (activeFeature: MapConfig['activeFeature']) => void;
}

const MapResizeHandler = ({ onMapRef }: { onMapRef: (map: L.Map | null) => void }) => {
    const map = useMap();
    const containerRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        containerRef.current = map.getContainer();
        onMapRef(map);

        const timeoutId = setTimeout(() => {
            map.invalidateSize();
        }, 100);

        return () => {
            clearTimeout(timeoutId);
            onMapRef(null);
        };
    }, [map, onMapRef]);

    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver(() => {
            setTimeout(() => {
                map.invalidateSize();
            }, 50);
        });

        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, [map]);

    useEffect(() => {
        const handleResize = () => {
            setTimeout(() => {
                map.invalidateSize();
            }, 100);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [map]);

    return null;
};

export const SingleMapView: React.FC<SingleMapViewProps> = memo(({
                                                                     config,
                                                                     isPrimary,
                                                                     mapConfigsLength,
                                                                     dataset,
                                                                     metricsData,
                                                                     censusBlockPolygons,
                                                                     hawaiianHomelandPolygons,
                                                                     pointLayers,
                                                                     onUpdateActiveFeature
                                                                 }) => {
    const effectiveDataset = config.dataset;
    const effectiveMetric = config.metric;
    const mapRef = useRef<L.Map | null>(null);

    useEffect(() => {
        if (mapRef.current) {
            const timeoutId = setTimeout(() => {
                mapRef.current?.invalidateSize();
            }, 200);
            return () => clearTimeout(timeoutId);
        }
    }, [mapConfigsLength]);

    const activeDatasetObject = useMemo(() => {
        if (!dataset || !effectiveDataset) return null;
        return dataset[effectiveDataset];
    }, [dataset, effectiveDataset]);

    const shouldShowHawaiianHomelands = useMemo(() => {
        return activeDatasetObject?.hawaiianHomelands || false;
    }, [activeDatasetObject]);

    const activeDatasetMetricObject = useMemo(() => {
        if (!activeDatasetObject || !effectiveMetric) return null;
        return activeDatasetObject.columnThresholds[effectiveMetric];
    }, [activeDatasetObject, effectiveMetric]);

    const getColor = useMemo(() => {
        return (value: number | null): string => {
            if (value === null || !activeDatasetMetricObject) {
                return '#cccccc';
            }
            const { thresholds, colors } = activeDatasetMetricObject;
            for (let i = 0; i < thresholds.length; i++) {
                if (value <= thresholds[i]) {
                    return colors[i];
                }
            }
            return '#333';
        };
    }, [activeDatasetMetricObject]);

    const getMetricValue = useMemo(() => {
        if (!metricsData || !effectiveDataset || !effectiveMetric) {
            return () => null;
        }

        const lookup = new Map<string, number>();
        Object.entries(metricsData).forEach(([geoid, data]) => {
            const value = data.metrics?.[effectiveDataset]?.[effectiveMetric];
            if (value !== undefined && value !== null) {
                lookup.set(geoid, value);
            }
        });

        return (geoid: string): number | null => {
            if (!geoid) return null;
            return lookup.get(geoid) ?? null;
        };
    }, [metricsData, effectiveDataset, effectiveMetric]);

    const handleFeatureClick = useCallback((e: LeafletMouseEvent) => {
        const layer = e.target;
        layer.bringToFront();

        const feature = layer.feature;
        if (!feature || !onUpdateActiveFeature) return;

        const geoid = feature.properties?.[POLYGON_LAYERS.censusBlockGroups.geoidProperty] || feature.properties?.[POLYGON_LAYERS.hawaiianHomelands.geoidProperty];
        if (!geoid) return;

        const map = mapRef.current;
        if (!map) return;

        const center = map.getCenter();
        const zoom = map.getZoom();

        onUpdateActiveFeature({
            geoid,
            lat: center.lat,
            lng: center.lng,
            zoom: zoom
        });

        const bounds = layer.getBounds();
        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [20, 20] });
        }
    }, [onUpdateActiveFeature]);

    const isHawaiianHomelandFeature = useCallback(() => {
        return false;
    }, []);

    if (!config.visible) {
        return null;
    }

    const censusPopupConfig = POLYGON_LAYERS.censusBlockGroups.popup;
    const homelandsPopupConfig = POLYGON_LAYERS.hawaiianHomelands.popup;

    return (
        <div className={`${styles['single-map-view']} ${isPrimary ? styles['primary-map'] : ''}`}>
            <div className={styles['map-header']}>
                <h3 className={styles['map-title']}>{config.title}</h3>
                <div className={styles['map-info']}>
                    {effectiveDataset && effectiveMetric ? (
                        <>
                            <span className={styles['dataset-name']}>
                                {effectiveDataset.replace(/_/g, ' ').toUpperCase()}
                            </span>
                            <span className={styles['metric-name']}>
                                {effectiveMetric}
                            </span>
                        </>
                    ) : (
                        <span className={styles['empty-state']}>
                            Select dataset and metric
                        </span>
                    )}
                </div>
            </div>

            <div className={styles['map-container']} style={{ position: 'relative', zIndex: 1 }}>
                <MapContainer
                    center={MAP_CONFIG.center}
                    zoom={MAP_CONFIG.zoom}
                    minZoom={MAP_CONFIG.minZoom}
                    maxBounds={MAP_CONFIG.maxBounds}
                    maxBoundsViscosity={MAP_CONFIG.maxBoundsViscosity}
                    className={styles['leaflet-map']}
                    style={{ zIndex: 1 }}
                >
                    <MapResizeHandler onMapRef={(map) => { mapRef.current = map; }} />

                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; OpenStreetMap contributors'
                    />

                    {(() => {
                        const shouldRenderCensus = effectiveDataset && effectiveMetric &&
                            censusBlockPolygons && metricsData && dataset && !shouldShowHawaiianHomelands;
                        const shouldRenderHomelands = effectiveDataset && effectiveMetric &&
                            shouldShowHawaiianHomelands && hawaiianHomelandPolygons && metricsData;
                        const shouldRenderCensusAsBackground = effectiveDataset && effectiveMetric &&
                            shouldShowHawaiianHomelands && censusBlockPolygons && metricsData && dataset;

                        return (
                            <>
                                {shouldRenderCensusAsBackground && (
                                    <GenericPolygonLayer
                                        data={censusBlockPolygons.features}
                                        onFeatureClick={handleFeatureClick}
                                        geoidProperty={POLYGON_LAYERS.censusBlockGroups.geoidProperty}
                                        getMetricValue={getMetricValue}
                                        getColor={getColor}
                                        activeMetric={effectiveMetric}
                                        activeFeatureGeoid={config.activeFeature?.geoid}
                                        mapId={config.id}
                                        popupConfig={censusPopupConfig}
                                        grayOutMode={true}
                                        isHawaiianHomelandFeature={isHawaiianHomelandFeature}
                                        pane="tilePane"
                                    />
                                )}

                                {shouldRenderCensus && (
                                    <GenericPolygonLayer
                                        data={censusBlockPolygons.features}
                                        onFeatureClick={handleFeatureClick}
                                        geoidProperty={POLYGON_LAYERS.censusBlockGroups.geoidProperty}
                                        getMetricValue={getMetricValue}
                                        getColor={getColor}
                                        activeMetric={effectiveMetric}
                                        activeFeatureGeoid={config.activeFeature?.geoid}
                                        mapId={config.id}
                                        popupConfig={censusPopupConfig}
                                    />
                                )}

                                {shouldRenderHomelands && (
                                    <GenericPolygonLayer<HawaiianHomelandProperties>
                                        data={hawaiianHomelandPolygons.features}
                                        onFeatureClick={handleFeatureClick}
                                        geoidProperty={POLYGON_LAYERS.hawaiianHomelands.geoidProperty}
                                        getMetricValue={getMetricValue}
                                        getColor={getColor}
                                        activeMetric={effectiveMetric}
                                        activeFeatureGeoid={config.activeFeature?.geoid}
                                        mapId={config.id}
                                        popupConfig={homelandsPopupConfig}
                                        pane="overlayPane"
                                        isHawaiianHomelandsLayer={true}
                                    />
                                )}
                            </>
                        );
                    })()}

                    {pointLayers.map(layer => (
                        <GenericPointMarkers key={layer.id} layer={layer} />
                    ))}
                </MapContainer>

                <MapLegend
                    dataset={dataset}
                    activeDataset={effectiveDataset}
                    activeDatasetMetric={effectiveMetric}
                />
            </div>
        </div>
    );
});
