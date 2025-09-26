import { GeoJSON, GeoJSONProps } from 'react-leaflet';
import {Feature, FeatureCollection, Geometry, GeoJsonProperties} from 'geojson';
import {Layer, LeafletMouseEvent, PathOptions} from 'leaflet';
import L from 'leaflet';
import { forwardRef } from 'react';

export interface PolygonLayerProps<T extends GeoJsonProperties = GeoJsonProperties> extends Omit<GeoJSONProps, 'data' | 'style' | 'onEachFeature'> {
    data: Feature<Geometry, T>[] | FeatureCollection<Geometry, T> | null;
    style: (feature?: Feature<Geometry, T>) => PathOptions;
    onFeatureClick: (e: LeafletMouseEvent) => void;
    geoidProperty: string;
    getMetricValue: (geoid: string) => number | null;
    activeMetric: string;
    popupConfig: {
        titleField: string;
        fields: Array<{
            key: string;
            label: string;
        }>;
    };
}

export const GenericPolygonLayer = forwardRef(<T extends GeoJsonProperties = GeoJsonProperties>({
  data,
  style,
  onFeatureClick,
  geoidProperty,
  getMetricValue,
  activeMetric,
  popupConfig,
  ...geoJsonProps
}: PolygonLayerProps<T>, ref: React.Ref<L.GeoJSON>) => {
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
        metricValue,
        activeMetric,
        popupConfig
      );
      layer.bindPopup(popupContent);
    }
  };

  if (!data) return null;

  // Convert Feature[] to FeatureCollection if needed
  const geoJsonData = Array.isArray(data) ? { type: 'FeatureCollection' as const, features: data } : data;

  return (
    <GeoJSON
      ref={ref}
      data={geoJsonData}
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
}) as <T extends GeoJsonProperties = GeoJsonProperties>(
  props: PolygonLayerProps<T> & { ref?: React.Ref<L.GeoJSON> }
) => React.ReactElement;

const createPopupContent = <T = GeoJsonProperties>(
  feature: Feature<Geometry, T>,
  metricValue: number | null,
  activeMetric: string,
  popupConfig: {
    titleField: string;
    fields: Array<{
      key: string;
      label: string;
    }>;
  }
): string => {
    const properties = feature.properties as Record<string, unknown>;
    const title = String(properties?.[popupConfig.titleField] || '');

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
