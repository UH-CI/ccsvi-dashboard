import React, { useMemo, useCallback, useRef, useEffect, memo } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { Geometry, FeatureCollection } from 'geojson';
import L, { LeafletMouseEvent } from 'leaflet';
import { MapConfig, BlockGroupProperties, HawaiianHomelandProperties, MetricsData, Dataset } from '../../types';
import { GenericPolygonLayer } from '../GenericPolygonLayer';
import { GenericPointMarkers } from '../PointLayers/PointLayers.tsx';
import { MapLegend } from '../MapLegend';
import { usePointLayers } from '../../hooks/usePointLayers.ts';
import { createColorFunction, createGenericStyleFunction, CENSUS_STYLE_CONFIG, HOMELANDS_STYLE_CONFIG } from '../../utils/mapStyling.ts';
import { mapParams } from '../../config.ts';
import styles from './SingleMapView.module.scss';

interface SingleMapViewProps {
    config: MapConfig;
    geoData: FeatureCollection<Geometry, BlockGroupProperties> | null;
    homelandsData: FeatureCollection<Geometry, HawaiianHomelandProperties> | null;
    metricsData: MetricsData | null;
    hawaiianHomelands: boolean;
    dataset: Dataset | null;
    isPrimary: boolean;
    mapConfigsLength?: number; // Trigger resize when maps are added/removed
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
    geoData,
    homelandsData,
    metricsData,
    hawaiianHomelands,
    dataset,
    isPrimary,
    mapConfigsLength
}) => {
    const effectiveDataset = config.dataset;
    const effectiveMetric = config.metric;

    const mapRef = useRef<L.Map | null>(null);

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

    const activeDatasetMetricObject = useMemo(() => {
        if (!activeDatasetObject || !effectiveMetric) return null;
        return activeDatasetObject.columnThresholds[effectiveMetric];
    }, [activeDatasetObject, effectiveMetric]);

    const getColor = useMemo(() => {
        return createColorFunction(activeDatasetMetricObject);
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

    const censusStyle = useMemo(() => {
        return createGenericStyleFunction<BlockGroupProperties>(
            getColor,
            getMetricValue,
            null, // No active feature highlighting
            'geoid20',
            CENSUS_STYLE_CONFIG
        );
    }, [getColor, getMetricValue]);

    const homelandStyle = useMemo(() => {
        return createGenericStyleFunction<HawaiianHomelandProperties>(
            getColor,
            getMetricValue,
            null, // No active feature highlighting
            'GEOID10',
            HOMELANDS_STYLE_CONFIG
        );
    }, [getColor, getMetricValue]);

    const handleFeatureClick = useCallback((e: LeafletMouseEvent) => {
        const layer = e.target;
        layer.bringToFront();
    }, []);

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

    // Popup configurations
    const censusPopupConfig = {
        title: 'Census Block Group',
        fields: [
            { key: 'geoid20', label: 'Geo Id' },
        ]
    };

    const homelandsPopupConfig = {
        title: 'Hawaiian Homeland',
        fields: [
            { key: 'GEOID10', label: 'Geo Id' },
            { key: 'NAME10', label: 'Name' }
        ]
    };

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

                    {effectiveDataset && effectiveMetric && geoData && metricsData && dataset && (
                        <GenericPolygonLayer
                            key={`census-${effectiveDataset}-${effectiveMetric}`}
                            data={geoData.features}
                            style={censusStyle}
                            onFeatureClick={handleFeatureClick}
                            geoidProperty="geoid20"
                            getMetricValue={getMetricValue}
                            activeMetric={effectiveMetric}
                            popupConfig={censusPopupConfig}
                            metricData={metricsData}
                        />
                    )}

                    {effectiveDataset && effectiveMetric && hawaiianHomelands && homelandsData && metricsData && (
                        <GenericPolygonLayer<HawaiianHomelandProperties>
                            key={`homelands-${effectiveDataset}-${effectiveMetric}`}
                            data={homelandsData.features}
                            style={homelandStyle}
                            onFeatureClick={handleFeatureClick}
                            geoidProperty="GEOID10"
                            getMetricValue={getMetricValue}
                            activeMetric={effectiveMetric}
                            popupConfig={homelandsPopupConfig}
                            metricData={metricsData}
                        />
                    )}

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


