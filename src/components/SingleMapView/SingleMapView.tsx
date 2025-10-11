import React, { useMemo, useCallback, useRef, useEffect, memo } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { Feature, FeatureCollection, Geometry } from 'geojson';
import L, { LeafletMouseEvent } from 'leaflet';
import {
    BlockGroupProperties,
    HawaiianHomelandProperties,
    CountyBoundariesProperties,
} from '../../types';
import { GenericPointMarkers } from '../PointLayers';
import { MapLegend } from '../MapLegend';
import { MAP_CONFIG } from "../../config";
import styles from './SingleMapView.module.scss';
import { CensusPolygonLayer } from "../PolygonLayers/CensusPolygonLayer";
import { HawaiianHomelandsPolygonLayer } from '../PolygonLayers/HawaiianHomelandsPolygonLayer';
import { CountyBoundariesBackgroundLayer } from '../PolygonLayers/CountyBoundariesBackgroundLayer';
import { useAppStore, useMapStore, useMapConfig, usePointLayerStore } from "../../stores";

interface SingleMapViewProps {
    mapId: string;
    isPrimary: boolean;
    mapConfigsLength: number;
    // onUpdateActiveFeature?: (activeFeature: MapConfig['activeFeature']) => void;
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
                                                                     mapId,
                                                                     isPrimary,
                                                                     mapConfigsLength,
                                                                     // onUpdateActiveFeature
                                                                 }) => {
    const mapRef = useRef<L.Map | null>(null);

    const config = useMapConfig(mapId)

    const {
        blockGroupData,
        metricsData,
        censusBlockGroups,
        hawaiianHomelands,
        countyBoundaries
    } = useAppStore();

    const { updateMapActiveFeature } = useMapStore();

    const effectiveDataset = config?.dataset;
    const effectiveMetric = config?.metric;

    const configs = usePointLayerStore(state => state.pointLayerConfigs);
    const data = usePointLayerStore(state => state.pointLayerData);
    const visibleIds = usePointLayerStore(state => state.visibleLayerIds);

    const visiblePointLayers = useMemo(() => {
        return configs
            .filter(config => visibleIds.has(config.id))
            .map(config => ({
                ...config,
                visible: true,
                data: data.get(config.id),
            }));
    }, [configs, data, visibleIds]);

    useEffect(() => {
        if (mapRef.current) {
            const timeoutId = setTimeout(() => {
                mapRef.current?.invalidateSize();
            }, 200);
            return () => clearTimeout(timeoutId);
        }
    }, [mapConfigsLength]);

    const activeDatasetObject = useMemo(() => {
        if (!blockGroupData || !effectiveDataset) return null;
        return blockGroupData[effectiveDataset];
    }, [blockGroupData, effectiveDataset]);

    const shouldShowHawaiianHomelands = useMemo(() => {
        return activeDatasetObject?.hawaiianHomelands || false;
    }, [activeDatasetObject]);

    const activeDatasetMetricObject = useMemo(() => {
        if (!activeDatasetObject || !effectiveMetric) return null;
        return activeDatasetObject.columnThresholds[effectiveMetric];
    }, [activeDatasetObject, effectiveMetric]);

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

    const handleFeatureClick = useCallback((
        feature: Feature<Geometry, BlockGroupProperties | HawaiianHomelandProperties> | null,
        e: LeafletMouseEvent
    ) => {
        const layer = e.target;
        layer.bringToFront();

        if (!feature) return;

        // Extract geoid - check both census and homelands properties
        const geoid = (feature.properties as BlockGroupProperties)?.geoid20 || 
              (feature.properties as HawaiianHomelandProperties)?.GEOID10;
        if (!geoid) return;

        const map = mapRef.current;
        if (!map) return;

        const center = map.getCenter();
        const zoom = map.getZoom();

        updateMapActiveFeature(mapId, {
            geoid,
            lat: center.lat,
            lng: center.lng,
            zoom: zoom
        });

        const bounds = layer.getBounds();
        if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [20, 20] });
        }
    }, [mapId, updateMapActiveFeature]);

    const shouldRenderCensus = effectiveDataset && effectiveMetric &&
        censusBlockGroups && metricsData && blockGroupData && !shouldShowHawaiianHomelands;

    const shouldRenderHawaiianHomelands = effectiveDataset && effectiveMetric &&
        shouldShowHawaiianHomelands && hawaiianHomelands && metricsData;

    const shouldRenderCountyBoundariesBackground = effectiveDataset && effectiveMetric &&
        shouldShowHawaiianHomelands && countyBoundaries;

    if (!config?.visible) {
        return null;
    }

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

                    {
                        shouldRenderCountyBoundariesBackground && (
                            <CountyBoundariesBackgroundLayer
                                data={countyBoundaries as FeatureCollection<Geometry, CountyBoundariesProperties>}
                                mapId={config.id}
                            />
                        )
                    }


                    {
                        shouldRenderCensus && (
                            <CensusPolygonLayer
                                data={censusBlockGroups as FeatureCollection<Geometry, BlockGroupProperties>}
                                metricsData={metricsData}
                                getMetricValue={getMetricValue}
                                mapId={config.id}
                                // activeDataset={effectiveDataset}
                                activeMetric={effectiveMetric}
                                activeFeatureGeoid={config.activeFeature?.geoid}
                                getColor={getColor}
                                onFeatureClick={handleFeatureClick}
                            />
                        )
                    }

                    {
                        shouldRenderHawaiianHomelands && (
                            <HawaiianHomelandsPolygonLayer
                                data={hawaiianHomelands as FeatureCollection<Geometry, HawaiianHomelandProperties>}
                                metricsData={metricsData}
                                getMetricValue={getMetricValue}
                                mapId={config.id}
                                // activeDataset={effectiveDataset}
                                activeMetric={effectiveMetric}
                                activeFeatureGeoid={config.activeFeature?.geoid}
                                getColor={getColor}
                                onFeatureClick={handleFeatureClick}
                            />
                        )
                    }

                    {visiblePointLayers.map(layer => (
                        <GenericPointMarkers key={layer.id} layer={layer} />
                    ))}
                </MapContainer>

                <MapLegend
                    dataset={blockGroupData}
                    activeDataset={effectiveDataset}
                    activeDatasetMetric={effectiveMetric}
                />
            </div>
        </div>
    );
});
