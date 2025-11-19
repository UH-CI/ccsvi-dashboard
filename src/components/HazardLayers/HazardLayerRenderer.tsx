// src/components/HazardLayers/HazardLayerRenderer.tsx
import React, { useEffect, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { FeatureCollection, Geometry } from 'geojson';
import { useHazardLayersStore } from '../../stores';
import type { HazardLayerConfig, SubHazardLayerConfig } from '../../types';

interface HazardLayerRendererProps {
  parentId: string;
  layerId?: string; // optional: can render parent or sublayer
}

export const HazardLayerRenderer: React.FC<HazardLayerRendererProps> = ({ parentId, layerId }) => {
  const map = useMap();
  const [leafletLayer, setLeafletLayer] = useState<L.Layer | null>(null);

  const hazardLayers = useHazardLayersStore(state => state.hazardLayers);
  const parentLayer = hazardLayers.find(h => h.id === parentId);
  const subLayer =
    layerId && parentLayer?.subLayers
      ? parentLayer.subLayers.find(sub => sub.id === layerId)
      : undefined;

  const activeLayer = subLayer ?? parentLayer;
  const isVisible = !!activeLayer?.visible;
  const filePath = activeLayer?.filePath;
  const popupConfig = activeLayer?.popupConfig;
  const color = activeLayer?.color || '#cc0000';

  useEffect(() => {
    if (!map) return;
  
    let currentLayer: L.Layer | null = null;
    let isMounted = true;
  
    const clearLayer = () => {
      if (currentLayer && map.hasLayer(currentLayer)) {
        map.removeLayer(currentLayer);
        currentLayer = null;
      }
    };
  
    const loadGeoJSON = async () => {
      if (!isVisible || !filePath) return;
      try {
        const response = await fetch(filePath);
        if (!response.ok) throw new Error(`Failed to load ${filePath}`);
        const geojson = (await response.json()) as FeatureCollection<Geometry>;
  
        if (!isMounted) return;
        const geoJsonLayer = L.geoJSON(geojson, {
          style: { color: color, weight: 2, opacity: 0.9, fillOpacity: 0.3 },
          onEachFeature: (feature, layer) => {
            if (popupConfig) {
              const popupContent = createPopupContent(feature, popupConfig);
              layer.bindPopup(popupContent);
            }
          },
        });
        geoJsonLayer.addTo(map);
        currentLayer = geoJsonLayer;
      } catch (err) {
        console.error('Error loading hazard GeoJSON:', err);
      }
    };
  
    loadGeoJSON();
  
    return () => {
      isMounted = false;
      clearLayer();
    };
  }, [map, filePath, isVisible, popupConfig]);

  return null;
};

const createPopupContent = (feature: any, popupConfig: any) => {
  const title = feature.properties?.[popupConfig.titleField] || 'Hazard Info';
  let html = `<h3>${title}</h3>`;
  if (popupConfig.fields && popupConfig.fields.length > 0) {
    html += '<ul>';
    popupConfig.fields.forEach((f: any) => {
      const value = feature.properties?.[f.key];
      if (value !== undefined && value !== null) {
        html += `<li><strong>${f.label}:</strong> ${value}</li>`;
      }
    });
    html += '</ul>';
  }
  return html;
};