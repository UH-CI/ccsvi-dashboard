import React from "react";
import { GeoJSON } from "react-leaflet";
import { FeatureCollection, Geometry } from "geojson";
import { HazardLayerConfig } from "../../types";
import L from "leaflet";

interface Props {
  layer: HazardLayerConfig & { data?: FeatureCollection<Geometry> };
}

export const GenericHazardLayer: React.FC<Props> = ({ layer }) => {
  if (!layer.visible || !layer.data) return null;

  return (
    <GeoJSON
      key={layer.id}
      data={layer.data}
      style={{
        color: layer.color || "red",
        weight: 2,
      }}
      //renderer={L.canvas()}
      onEachFeature={(feature, geoLayer) => {
        // Build popup content
        let popupContent: string;
        if (layer.popupConfig) {
          const titleField = layer.popupConfig.titleField;
          const title =
            titleField && feature.properties?.[titleField]
              ? `<strong>${feature.properties[titleField]}</strong><br/>`
              : "<strong>No title</strong><br/>";

          const fields = layer.popupConfig.fields
            ?.map((f) => {
              const val = feature.properties?.[f.key];
              return val ? `<b>${f.label}:</b> ${val}<br/>` : "";
            })
            .join("");

          popupContent = `${title}${fields || ""}`;
        } else {
          popupContent = `<pre>${JSON.stringify(
            feature.properties,
            null,
            2
          )}</pre>`;
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
};
