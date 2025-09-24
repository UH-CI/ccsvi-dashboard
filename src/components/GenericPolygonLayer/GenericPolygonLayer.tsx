import React from 'react';
import { GeoJSON, GeoJSONProps } from 'react-leaflet';
import { Feature, Geometry } from 'geojson';
import { Layer, LeafletMouseEvent } from 'leaflet';

export interface PolygonLayerProps<T = any> extends Omit<GeoJSONProps, 'data' | 'style' | 'onEachFeature'> {
  data: Feature<Geometry, T>[] | null;
  style: (feature?: Feature<Geometry, T>) => any;
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
  metricsData?: any;
}

export const GenericPolygonLayer = <T = any>({
  data,
  style,
  onFeatureClick,
  geoidProperty,
  getMetricValue,
  activeMetric,
  popupConfig,
  metricsData,
  ...geoJsonProps
}: PolygonLayerProps<T>) => {
  const onEachFeature = (feature: Feature<Geometry, T>, layer: Layer): void => {
    if (!feature.properties) return;

    const geoid = feature.properties[geoidProperty] as string;
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
        metricsData
      );
      layer.bindPopup(popupContent);
    }
  };

  if (!data) return null;

  return (
    <GeoJSON
      data={data}
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

const createPopupContent = <T = any>(
  feature: Feature<Geometry, T>,
  geoid: string,
  metricValue: number | null,
  activeMetric: string,
  popupConfig: {
    titleField: string;
    fields: Array<{
      key: string;
      label: string;
    }>;
  },
  metricsData?: any
): string => {
  const title = feature.properties?.[popupConfig.titleField] || 'Unknown';
  
  let content = `<div><b>${title}</b><br>`;
  
  // Add geoid
  content += `<b>Geo ID:</b> ${geoid}<br>`;
  
  // Add other fields from config
  popupConfig.fields.forEach(field => {
    const value = feature.properties?.[field.key] || metricsData?.[geoid]?.[field.key] || 'N/A';
    content += `<b>${field.label}:</b> ${value}<br>`;
  });
  
  // Add metric value if available
  if (activeMetric) {
    content += `<b>${activeMetric}:</b> ${metricValue ?? 'N/A'}`;
  }
  
  content += '</div>';
  return content;
};
