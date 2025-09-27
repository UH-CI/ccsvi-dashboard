import { GeoJSON, GeoJSONProps } from 'react-leaflet';
import {Feature, FeatureCollection, Geometry, GeoJsonProperties} from 'geojson';
import {Layer, LeafletMouseEvent, PathOptions} from 'leaflet';

export interface PolygonLayerProps<T extends GeoJsonProperties = GeoJsonProperties> extends Omit<GeoJSONProps, 'data' | 'style' | 'onEachFeature'> {
    data: Feature<Geometry, T>[] | FeatureCollection<Geometry, T> | null;
    style: (feature?: Feature<Geometry, T>) => PathOptions;
    onFeatureClick: (e: LeafletMouseEvent) => void;
    geoidProperty: string;
    getMetricValue: (geoid: string) => number | null;
    activeMetric: string;
    popupConfig: {
        title: string;
        fields: Array<{
            key: string;
            label: string;
        }>;
    };
}

export const GenericPolygonLayer = <T extends GeoJsonProperties = GeoJsonProperties>({
                                                                                         data,
                                                                                         style,
                                                                                         onFeatureClick,
                                                                                         geoidProperty,
                                                                                         getMetricValue,
                                                                                         activeMetric,
                                                                                         popupConfig,
                                                                                         ...geoJsonProps
                                                                                     }: PolygonLayerProps<T>) => {
    const onEachFeature = (feature: Feature<Geometry, T>, layer: Layer): void => {
        if (!feature.properties) return;

        const properties = feature.properties as Record<string, unknown>;
        const geoid = String(properties[geoidProperty] ?? '');
        const metricValue = getMetricValue(geoid);

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

    if (!data) return null;

    // Convert array of features to FeatureCollection if needed
    const featureCollection: FeatureCollection<Geometry, T> = Array.isArray(data)
        ? {
            type: 'FeatureCollection',
            features: data
        }
        : data;

    return (
        <GeoJSON
            data={featureCollection}
            style={style}
            onEachFeature={onEachFeature}
            eventHandlers={{
                click: (e) => {
                    e.originalEvent.stopPropagation();
                }
            }}
            {...geoJsonProps}
        />
    );
};

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

    // Add other fields from config
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