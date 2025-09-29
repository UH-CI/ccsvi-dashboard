import React, { useMemo, useCallback, useRef, useEffect, memo } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L, { LeafletMouseEvent } from 'leaflet';
// import { Feature, Geometry, GeoJsonProperties } from 'geojson';
import { MapConfig, HawaiianHomelandProperties, MetricsData, Dataset } from '../../types';
import { GenericPolygonLayer } from '../GenericPolygonLayer';
import { GenericPointMarkers } from '../PointLayers/PointLayers.tsx';
import { MapLegend } from '../MapLegend';
import { usePointLayers } from '../../hooks/usePointLayers.ts';
import { useMapPolygonLayers } from '../../hooks/useMapPolygonLayers.ts';
import { mapParams, polygonLayerConfigs } from '../../config.ts';
import styles from './SingleMapView.module.scss';

interface SingleMapViewProps {
    config: MapConfig;
    metricsData: MetricsData | null;
    dataset: Dataset | null;
    isPrimary: boolean;
    mapConfigsLength?: number; // Trigger resize when maps are added/removed
    onUpdateActiveFeature?: (activeFeature: MapConfig['activeFeature']) => void;
}

const MapResizeHandler = ({ onMapRef }: { onMapRef: (map: L.Map | null) => void }) => {
    const map = useMap();
    const containerRef = useRef<HTMLElement | null>(null);

    useEffect(() => {
        containerRef.current = map.getContainer();
        onMapRef(map);

        // Force map to recalculate its size when component mounts
        const timeoutId = setTimeout(() => {
            map.invalidateSize();
        }, 100);

        return () => {
            clearTimeout(timeoutId);
            onMapRef(null);
        };
    }, [map, onMapRef]);

    // Use ResizeObserver to detect container size changes
    useEffect(() => {
        if (!containerRef.current) return;

        const resizeObserver = new ResizeObserver(() => {
            // Debounce the resize to avoid excessive calls
            setTimeout(() => {
                map.invalidateSize();
            }, 50);
        });

        resizeObserver.observe(containerRef.current);

        return () => {
            resizeObserver.disconnect();
        };
    }, [map]);

    // Also handle window resize events
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
    metricsData,
    dataset,
    isPrimary,
    mapConfigsLength,
    onUpdateActiveFeature
}) => {
    const effectiveDataset = config.dataset;
    const effectiveMetric = config.metric;

    const mapRef = useRef<L.Map | null>(null);

    // Load polygon layers for this specific map based on its dataset
    const { geoData, homelandsData } = useMapPolygonLayers(dataset, effectiveDataset);

    const isHawaiianHomelandFeature = useCallback(() => {
        return false;
    }, []);

    // Point layers for this single map
    const { pointLayers } = usePointLayers([]);

    // Force map resize when the number of maps changes
    useEffect(() => {
        if (mapRef.current) {
            // Delay to ensure DOM has updated
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

    // Determine if Hawaiian homelands should be shown for this map's dataset
    const shouldShowHawaiianHomelands = useMemo(() => {
        const result = activeDatasetObject?.hawaiianHomelands || false;
        return result;
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
        
        // Get the feature properties to extract geoid
        const feature = layer.feature;
        if (!feature || !onUpdateActiveFeature) return;
        
        const geoid = feature.properties?.geoid20 || feature.properties?.GEOID10;
        if (!geoid) return;
        
        // Get current map position
        const map = mapRef.current;
        if (!map) return;
        
        const center = map.getCenter();
        const zoom = map.getZoom();
        
        // Update active feature
        const newActiveFeature = {
            geoid,
            lat: center.lat,
            lng: center.lng,
            zoom: zoom
        };
        
        onUpdateActiveFeature(newActiveFeature);
        
        // Center map on the clicked feature
        const bounds = layer.getBounds();
        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [20, 20] });
        }
    }, [onUpdateActiveFeature]);

    // Determine initial map position
    const initialMapPosition = {
        lat: mapParams.mapCenter[0],
        lng: mapParams.mapCenter[1],
        zoom: mapParams.mapZoom
    };

    // Don't render if not visible
    if (!config.visible) {
        return null;
    }

    // Use centralized popup configurations
    const censusPopupConfig = polygonLayerConfigs.census.popupConfig;
    const homelandsPopupConfig = polygonLayerConfigs.hawaiianHomelands.popupConfig;

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
                    center={[initialMapPosition.lat, initialMapPosition.lng]}
                    zoom={initialMapPosition.zoom}
                    minZoom={mapParams.minZoom}
                    maxBounds={mapParams.maxBounds}
                    maxBoundsViscosity={mapParams.maxBoundsViscosity}
                    className={styles['leaflet-map']}
                    style={{ zIndex: 1 }}
                >
                    <MapResizeHandler onMapRef={(map) => { mapRef.current = map; }} />
                    
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; OpenStreetMap contributors'
                    />

                    {(() => {
                        const shouldRenderCensus = effectiveDataset && effectiveMetric && geoData && metricsData && dataset && !shouldShowHawaiianHomelands;
                        const shouldRenderHomelands = effectiveDataset && effectiveMetric && shouldShowHawaiianHomelands && homelandsData && metricsData;
                        const shouldRenderCensusAsBackground = effectiveDataset && effectiveMetric && shouldShowHawaiianHomelands && geoData && metricsData && dataset;
                        
                        
                        return (
                            <>
                                {/* Render census data as gray background when showing Hawaiian homelands */}
                                {shouldRenderCensusAsBackground && (
                                    <GenericPolygonLayer
                                        data={geoData.features}
                                        onFeatureClick={handleFeatureClick}
                                        geoidProperty="geoid20"
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

                                {/* Render census data normally when not showing Hawaiian homelands */}
                                {shouldRenderCensus && (
                                    <GenericPolygonLayer
                                        data={geoData.features}
                                        onFeatureClick={handleFeatureClick}
                                        geoidProperty="geoid20"
                                        getMetricValue={getMetricValue}
                                        getColor={getColor}
                                        activeMetric={effectiveMetric}
                                        activeFeatureGeoid={config.activeFeature?.geoid}
                                        mapId={config.id}
                                        popupConfig={censusPopupConfig}
                                    />
                                )}

                                {/* Render Hawaiian homelands data - this should be on top */}
                                {shouldRenderHomelands && (
                                    <GenericPolygonLayer<HawaiianHomelandProperties>
                                        data={homelandsData.features}
                                        onFeatureClick={handleFeatureClick}
                                        geoidProperty="GEOID10"
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


