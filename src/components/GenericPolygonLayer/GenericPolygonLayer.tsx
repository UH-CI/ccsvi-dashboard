import { GeoJSON, GeoJSONProps } from 'react-leaflet';
import {Feature, FeatureCollection, Geometry, GeoJsonProperties} from 'geojson';
import {Layer, LeafletMouseEvent, PathOptions} from 'leaflet';
import React, { useEffect, useCallback, memo } from 'react';

// Global ref to store layers per map across component remounts
const globalLayersRef = new Map<string, Map<string, { layer: Layer; feature: Feature<Geometry, GeoJsonProperties> }>>();

export interface PolygonLayerProps<T extends GeoJsonProperties = GeoJsonProperties> extends Omit<GeoJSONProps, 'data' | 'style' | 'onEachFeature'> {
    data: Feature<Geometry, T>[] | FeatureCollection<Geometry, T> | null;
    onFeatureClick: (e: LeafletMouseEvent) => void;
    geoidProperty: string;
    getMetricValue: (geoid: string) => number | null;
    getColor: (value: number | null) => string;
    activeMetric: string;
    activeFeatureGeoid?: string | null;
    mapId: string; // mapId to identify which map the layer belongs to
    popupConfig: {
        title: string;
        fields: Array<{
            key: string;
            label: string;
        }>;
    };
    grayOutMode?: boolean;
    isHawaiianHomelandFeature?: (feature: Feature<Geometry, T>) => boolean;
    isHawaiianHomelandsLayer?: boolean;
}

export const GenericPolygonLayer = memo(<T extends GeoJsonProperties = GeoJsonProperties>({
                                                                                         data,
                                                                                         onFeatureClick,
                                                                                         geoidProperty,
                                                                                         getMetricValue,
                                                                                         getColor,
                                                                                         activeMetric,
                                                                                         activeFeatureGeoid,
                                                                                         mapId,
                                                                                         popupConfig,
                                                                                         grayOutMode = false,
                                                                                         isHawaiianHomelandFeature,
                                                                                         isHawaiianHomelandsLayer = false,
                                                                                         ...geoJsonProps
                                                                                     }: PolygonLayerProps<T>) => {
    // Use global ref to persist layers per map across component remounts
    if (!globalLayersRef.has(mapId)) {
        globalLayersRef.set(mapId, new Map());
    }
    const layersRef = globalLayersRef.get(mapId)!;

    const styleCallback = useCallback((feature?: Feature<Geometry, T>) => {
        if (!feature || !feature.properties) {
            return {
                fillColor: '#cccccc',
                weight: 0.5,
                opacity: 1,
                color: '#333',
                fillOpacity: 0.3
            };
        }

        // Check if this feature should be grayed out
        if (grayOutMode && isHawaiianHomelandFeature && !isHawaiianHomelandFeature(feature)) {
            return {
                fillColor: '#d0d0d0',
                weight: 0.8,
                dashArray: '5, 5',
                opacity: 0.5,
                color: '#999',
                fillOpacity: 0.8
            };
        }

        const properties = feature.properties as Record<string, unknown>;
        const geoid = String(properties[geoidProperty] ?? '');
        const metricValue = getMetricValue(geoid);
        const originalColor = getColor(metricValue);

        // Enhanced styling for Hawaiian homelands layer
        if (isHawaiianHomelandsLayer) {
            return {
                fillColor: originalColor,
                weight: 1.5,
                opacity: 1,
                color: '#000',
                fillOpacity: 0.7
            };
        }

        return {
            fillColor: originalColor,
            weight: 0.5,
            opacity: 1,
            color: '#333',
            fillOpacity: 0.3
        };
    }, [geoidProperty, getMetricValue, getColor, grayOutMode, isHawaiianHomelandFeature, isHawaiianHomelandsLayer]);


    const onEachFeature = (feature: Feature<Geometry, T>, layer: Layer): void => {
        if (!feature.properties) return;

        const properties = feature.properties as Record<string, unknown>;
        const geoid = String(properties[geoidProperty] ?? '');
        const metricValue = getMetricValue(geoid);

        // Store both layer and feature references for dynamic highlighting
        layersRef.set(geoid, { layer, feature });

        layer.on({
            click: onFeatureClick,
        });

        if ('bindPopup' in layer) {
            const popupContent = createPopupContent(
                feature,
                geoid,
                metricValue,
                activeMetric,
                popupConfig,
            );
            layer.bindPopup(popupContent);
        }
    };

    // Handle dynamic highlighting when activeFeatureGeoid changes
    useEffect(() => {
        if (!activeFeatureGeoid) {
            return;
        }
        
        layersRef.forEach(({ layer }, geoid) => {
            const isActive = activeFeatureGeoid === geoid;
            
            if ('setStyle' in layer) {
                const originalColor = (layer as { options?: PathOptions }).options?.fillColor || '#cccccc';
                
                if (isActive) {
                    (layer as { setStyle: (style: PathOptions) => void }).setStyle({
                        weight: 4,
                        color: '#000000',
                        fillColor: originalColor,
                        fillOpacity: 0.8,
                        opacity: 1
                    });
                } else {
                    // Reset to default style with original color
                    (layer as { setStyle: (style: PathOptions) => void }).setStyle({
                        weight: 1,
                        color: '#333333',
                        fillColor: originalColor,
                        fillOpacity: 0.3,
                        opacity: 0.8
                    });
                }
            }
        });
    }, [activeFeatureGeoid, layersRef]);


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
    const dataEqual = prevProps.data === nextProps.data;
    const activeFeatureEqual = prevProps.activeFeatureGeoid === nextProps.activeFeatureGeoid;
    const geoidPropertyEqual = prevProps.geoidProperty === nextProps.geoidProperty;
    const activeMetricEqual = prevProps.activeMetric === nextProps.activeMetric;
    const mapIdEqual = prevProps.mapId === nextProps.mapId;
    const popupTitleEqual = prevProps.popupConfig.title === nextProps.popupConfig.title;
    const popupFieldsEqual = JSON.stringify(prevProps.popupConfig.fields) === JSON.stringify(nextProps.popupConfig.fields);
    const grayOutModeEqual = prevProps.grayOutMode === nextProps.grayOutMode;
    const isHawaiianHomelandFeatureEqual = prevProps.isHawaiianHomelandFeature === nextProps.isHawaiianHomelandFeature;
    const isHawaiianHomelandsLayerEqual = prevProps.isHawaiianHomelandsLayer === nextProps.isHawaiianHomelandsLayer;
    
    return (
        dataEqual &&
        activeFeatureEqual &&
        geoidPropertyEqual &&
        activeMetricEqual &&
        mapIdEqual &&
        popupTitleEqual &&
        popupFieldsEqual &&
        grayOutModeEqual &&
        isHawaiianHomelandFeatureEqual &&
        isHawaiianHomelandsLayerEqual
    );
}) as <T extends GeoJsonProperties = GeoJsonProperties>(props: PolygonLayerProps<T>) => React.JSX.Element;

const createPopupContent = <T extends GeoJsonProperties>(
    feature: Feature<Geometry, T>,
    geoid: string,
    metricValue: number | null,
    activeMetric: string,
    popupConfig: {
        title: string;
        fields: Array<{
            key: string;
            label: string;
        }>;
    },
): string => {
    const properties = feature.properties as Record<string, unknown>;
    const title = String(properties?.[popupConfig.title] || '');

    let content = `<div><b>${title}</b><br>`;

    // Add fields from config
    popupConfig.fields.forEach(field => {
        const propertyValue = properties[field.key];
        const value = String(propertyValue ?? 'N/A');
        content += `<b>${field.label}:</b> ${value}<br>`;
    });

    // Add metric value if available
    if (activeMetric) {
        content += `<b>${activeMetric}:</b> ${metricValue ?? 'N/A'}`;
    }

    content += '</div>';
    return content;
};