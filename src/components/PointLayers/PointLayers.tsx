import React, { useState, useEffect } from "react";
import { Marker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { renderToString } from "react-dom/server";
import * as FaIcons from "react-icons/fa";
import L from "leaflet";
import "leaflet.markercluster";
import { Feature, Point } from "geojson";
import styles from "./PointLayers.module.scss";
import { PointLayerConfig } from "../../types";

export const GenericPointMarkers: React.FC<{
  layer: PointLayerConfig;
}> = ({ layer }) => {
  const map = useMap() as L.Map;
  const [zoom, setZoom] = useState(map.getZoom());

  // Track zoom level
  useEffect(() => {
    const handleZoom = () => setZoom(map.getZoom());
    map.on("zoomend", handleZoom);
    return () => {
      map.off("zoomend", handleZoom);
    };
  }, [map]);

  if (!layer.visible || !layer.data) return null;

  const IconComponent =
    FaIcons[layer.icon as keyof typeof FaIcons] || FaIcons.FaCircle;

  // Calculate icon size based on zoom
  const getIconSize = (currentZoom: number): number => {
    const baseZoom = 8;
    const baseSize = 18;
    const scaleFactor = 0.15;
    const calculatedSize =
      baseSize + (currentZoom - baseZoom) * scaleFactor * baseSize;
    return Math.max(8, Math.min(32, Math.round(calculatedSize)));
  };

  const iconSize = getIconSize(zoom);
  const iconElementSize = Math.round(iconSize * 0.67);

  const customIcon = L.divIcon({
    html: renderToString(
      <div
        className={styles.iconContainer}
        style={{
          width: `${iconSize}px`,
          height: `${iconSize}px`,
          color: layer.color,
        }}
      >
        <IconComponent size={iconElementSize} />
      </div>
    ),
    className: styles.genericPointMarker,
    iconSize: [iconSize, iconSize],
    iconAnchor: [iconSize / 2, iconSize / 2],
  });

  const renderPopupContent = (feature: Feature<Point>) => {
    const title = feature.properties?.[layer.popupConfig.titleField] || "";
    const fields = layer.popupConfig.fields
      .map((field) => {
        const value = feature.properties?.[field.key];
        if (value === null || value === undefined || value === "") return null;
        return `<b>${field.label}:</b> ${value}<br/>`;
      })
      .filter(Boolean)
      .join("");

    return `<div class="${styles.popupContent}"><b>${title}</b><br/>${fields}</div>`;
  };

  const createClusterIcon = (cluster: L.MarkerCluster) =>
    L.divIcon({
      html: `
        <div style="
        background:${layer.color};
        width:40px;
        height:40px;
        border-radius:50%;
        display:flex;
        align-items:center;
        justify-content:center;
        color:white;
        font-weight:bold;
        box-shadow: 0 0 0 4px rgba(0,0,0,0.2);
        ">
        ${cluster.getChildCount()}
        </div>`,
      className: "",
      iconSize: [40, 40],
    });

  return (
    <>
      <MarkerClusterGroup
        iconCreateFunction={createClusterIcon}
        chunkedLoading
        spiderfyOnMaxZoom
        showCoverageOnHover={false}
        maxClusterRadius={50}
      >
        {layer.data.features
          .filter(
            (feature) =>
              feature.geometry &&
              feature.geometry.type === "Point" &&
              feature.properties &&
              (feature.properties.objectid || feature.properties.OBJECTID) !== 0
          )
          .map((feature, index) => {
            const featureId =
              feature.properties?.objectid ||
              feature.properties?.OBJECTID ||
              feature.properties?.id ||
              index;

            const coords = feature.geometry.coordinates;
            if (!coords || coords.length < 2) return null; // skip invalid

            const [longitude, latitude] = coords;

            return (
              <Marker
                key={`${layer.id}-${featureId}`}
                position={[latitude, longitude]}
                icon={customIcon}
              >
                <Popup>
                  <div
                    dangerouslySetInnerHTML={{
                      __html: renderPopupContent(feature),
                    }}
                  />
                </Popup>
              </Marker>
            );
          })}
      </MarkerClusterGroup>
    </>
  );
};
