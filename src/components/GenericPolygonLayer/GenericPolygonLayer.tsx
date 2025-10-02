import { GeoJSON, GeoJSONProps } from 'react-leaflet';
import {Feature, FeatureCollection, Geometry, GeoJsonProperties} from 'geojson';
import {Layer, LeafletMouseEvent, PathOptions} from 'leaflet';
import React, { useEffect, useCallback, memo } from 'react';

// Global ref to store layers per map across component remounts
// const globalLayersRef = new Map<string, Map<string, { layer: Layer; feature: Feature<Geometry, GeoJsonProperties> }>>();
const globalLayersRef = new Map<string, Map<string, Layer>>();

export interface StyleConfig {
    fillColor: string;
    weight: number;
    opacity: number;
    color: string;
    fillOpacity: number;
    dashArray?: string;
}

export interface GenericPolygonLayerProps<T extends GeoJsonProperties = GeoJsonProperties> extends Omit<GeoJSONProps, 'data' | 'style' | 'onEachFeature'> {
    data: Feature<Geometry, T>[] | FeatureCollection<Geometry, T> | null;
    mapId: string; // mapId to identify which map the layer belongs to
    geoidProperty: string; // Layer GEOID
    activeFeatureGeoid?: string | null;
    getStyle: (feature: Feature<Geometry, T> | undefined) => StyleConfig;
    getHighlightStyle?: (feature: Feature<Geometry, T>, baseStyle: StyleConfig | undefined) => StyleConfig;
    onFeatureClick?: (feature: Feature<Geometry, T>, e: LeafletMouseEvent) => void;
    renderPopup?: (feature: Feature<Geometry, T>) => string | null;

    // onFeatureClick: (e: LeafletMouseEvent) => void;
    // getMetricValue: (geoid: string) => number | null;
    // getColor: (value: number | null) => string;
    // activeMetric: string;
    // popupConfig: {
    //     title: string;
    //     fields: Array<{
    //         key: string;
    //         label: string;
    //     }>;
    // };
    // grayOutMode?: boolean;
    // isHawaiianHomelandFeature?: (feature: Feature<Geometry, T>) => boolean;
    // isHawaiianHomelandsLayer?: boolean;
}

export const GenericPolygonLayer = memo(<T extends GeoJsonProperties = GeoJsonProperties>({
                                                                                         data,
                                                                                            mapId,
                                                                                            geoidProperty,
                                                                                            activeFeatureGeoid,
                                                                                            getStyle,
                                                                                            getHighlightStyle,
                                                                                            onFeatureClick,
                                                                                            renderPopup,
                                                                                         // onFeatureClick,
                                                                                         // geoidProperty,
                                                                                         // getMetricValue,
                                                                                         // getColor,
                                                                                         // activeMetric,
                                                                                         // activeFeatureGeoid,
                                                                                         // mapId,
                                                                                         // popupConfig,
                                                                                         // grayOutMode = false,
                                                                                         // isHawaiianHomelandFeature,
                                                                                         // isHawaiianHomelandsLayer = false,
                                                                                         ...geoJsonProps
                                                                                     }: GenericPolygonLayerProps<T>) => {
    // Initialize layer storage for this map
    if (!globalLayersRef.has(mapId)) {
        globalLayersRef.set(mapId, new Map());
    }
    const layersRef = globalLayersRef.get(mapId)!;

    const styleCallback = useCallback((feature?: Feature<Geometry, T>): PathOptions => {
        if (!feature) {
            return {
                fillColor: '#cccccc',
                weight: 0.5,
                opacity: 1,
                color: '#333',
                fillOpacity: 0.3
            };
        }

        return getStyle(feature);
    }, [getStyle]);

    //     // Check if this feature should be grayed out
    //     if (grayOutMode && isHawaiianHomelandFeature && !isHawaiianHomelandFeature(feature)) {
    //         return {
    //             fillColor: '#d0d0d0',
    //             weight: 0.8,
    //             dashArray: '5, 5',
    //             opacity: 0.5,
    //             color: '#999',
    //             fillOpacity: 0.8
    //         };
    //     }
    //
    //     const properties = feature.properties as Record<string, unknown>;
    //     const geoid = String(properties[geoidProperty] ?? '');
    //     const metricValue = getMetricValue(geoid);
    //     const originalColor = getColor(metricValue);
    //
    //     // Enhanced styling for Hawaiian homelands layer
    //     if (isHawaiianHomelandsLayer) {
    //         return {
    //             fillColor: originalColor,
    //             weight: 1.5,
    //             opacity: 1,
    //             color: '#000',
    //             fillOpacity: 0.7
    //         };
    //     }
    //
    //     return {
    //         fillColor: originalColor,
    //         weight: 0.5,
    //         opacity: 1,
    //         color: '#333',
    //         fillOpacity: 0.3
    //     };
    // }, [geoidProperty, getMetricValue, getColor, grayOutMode, isHawaiianHomelandFeature, isHawaiianHomelandsLayer]);


    const onEachFeature = useCallback((feature: Feature<Geometry, T>, layer: Layer): void => {
        if (!feature.properties) return;

        const geoid = String(feature.properties[geoidProperty] ?? '');

        // Store both layer reference for dynamic highlighting
        layersRef.set(geoid, layer);

        if (onFeatureClick) {
            layer.on('click', (e: LeafletMouseEvent) => {
                onFeatureClick(feature, e);
            });
        }

        if ('bindPopup' in layer && renderPopup) {
            const popupContent = renderPopup(feature);

            if (popupContent) {
                layer.bindPopup(popupContent, {
                    minWidth: 300,
                    maxWidth: 400
                })
            }
        }
    }, [geoidProperty, onFeatureClick, renderPopup, layersRef]);

    // Handle dynamic highlighting when activeFeatureGeoid changes
    useEffect(() => {
        layersRef.forEach((layer, geoid) => {
            if (!('setStyle' in layer)) return;

            const isActive = activeFeatureGeoid === geoid;

            const layerWithFeature = layer as Layer & { feature?: Feature<Geometry, T> };
            const feature = layerWithFeature.feature;

            if (!feature) return;

            const baseStyle = getStyle(feature);
            const highlightStyle = isActive && getHighlightStyle ? getHighlightStyle(feature, baseStyle) : baseStyle;

            (layer as { setStyle: (style: PathOptions) => void }).setStyle(highlightStyle);
        });
    }, [activeFeatureGeoid, layersRef, getStyle, getHighlightStyle]);


    if (!data) {
        return null;
    }

    const featureCollection: FeatureCollection<Geometry, T> = Array.isArray(data)
        ? {
            type: 'FeatureCollection',
            features: data
        }
        : data;

    return (
        <GeoJSON
            key={`{mapId}-${activeFeatureGeoid}`}
            data={featureCollection}
            style={styleCallback}
            onEachFeature={onEachFeature}
            eventHandlers={{
                click: (e) => {
                    e.originalEvent.stopPropagation();
                }
            }}
            {...geoJsonProps}
        />
    );
}, (prevProps, nextProps) => {
    // Custom comparison to prevent unnecessary re-renders
    // Only compare essential props, ignore function references that change frequently
    return (
        prevProps.data === nextProps.data &&
        prevProps.activeFeatureGeoid === nextProps.activeFeatureGeoid &&
        prevProps.geoidProperty === nextProps.geoidProperty &&
        prevProps.mapId === nextProps.mapId &&
        prevProps.getStyle === nextProps.getStyle &&
        prevProps.getHighlightStyle === nextProps.getHighlightStyle &&
        prevProps.onFeatureClick === nextProps.onFeatureClick &&
        prevProps.renderPopup === nextProps.renderPopup
    );
}) as <T extends GeoJsonProperties = GeoJsonProperties>(props: GenericPolygonLayerProps<T>) => React.JSX.Element;