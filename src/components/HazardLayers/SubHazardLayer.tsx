import React from "react";
import { GeoJSON } from "react-leaflet";
import { FeatureCollection, Geometry } from "geojson";
import { SubHazardLayerConfig } from "../../types";
import L from "leaflet";

interface Props {
  layer: SubHazardLayerConfig & { data?: FeatureCollection<Geometry> };
  color?: string;
}

export const SubHazardLayer: React.FC<Props> = ({ layer, color = "orange" }) => {
  if (!layer.visible || !layer.data) return null;

  try {
    return (
    <GeoJSON
      key={layer.id}
      data={layer.data}
      style={{
        color: color,
        weight: 2,
        opacity: 0.8,
      }}
      onEachFeature={(feature, geoLayer) => {
        // Build popup content
        let popupContent: string;
        if (layer.popupConfig) {
          const titleField = layer.popupConfig.titleField;
          const title =
            titleField && feature.properties?.[titleField]
              ? `<strong>${feature.properties[titleField]}</strong><br/>`
              : `<strong>${layer.name}</strong><br/>`;

          const fields = layer.popupConfig.fields
            ?.map((f) => {
              const val = feature.properties?.[f.key];
              return val ? `<b>${f.label}:</b> ${val}<br/>` : "";
            })
            .join("");

          popupContent = `${title}${fields || ""}`;
        } else {
          // Fallback to basic property information
          popupContent = `<strong>${layer.name}</strong><br/>`;
          if (feature.properties) {
            Object.entries(feature.properties).forEach(([key, value]) => {
              if (value !== null && value !== undefined) {
                popupContent += `<b>${key}:</b> ${value}<br/>`;
              }
            });
          }
        }

        geoLayer.bindPopup(popupContent);

        // Override default popup behavior → always open at center of polygon
        geoLayer.on("click", () => {
          if ("getBounds" in geoLayer) {
            const center = (geoLayer as L.Polygon).getBounds().getCenter();
            geoLayer.openPopup(center);
          }
        });
      }}
    />
  );
  } catch (error) {
    console.error('Error in SubHazardLayer:', error);
    return null;
  }
};
