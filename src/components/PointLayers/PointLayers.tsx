import React, { useState, useEffect, useMemo } from "react";
import { Marker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { renderToString } from "react-dom/server";
import * as FaIcons from "react-icons/fa";
import L from "leaflet";
import "leaflet.markercluster";
import { Feature, Point } from "geojson";
import styles from "./PointLayers.module.scss";
import { usePointLayerStore } from "../../stores";

interface GenericPointMarkersProps {
  layerId: string;
  mapId: string;
}

export const GenericPointMarkers: React.FC<GenericPointMarkersProps> = ({ layerId, mapId }) => {
  const map = useMap() as L.Map;
  const [zoom, setZoom] = useState(map.getZoom());

  // Get data from store
  const config = usePointLayerStore((state) =>
    state.pointLayerConfigs.find((c) => c.id === layerId),
  );
  const data = usePointLayerStore((state) => state.pointLayerData.get(layerId));
  // const isVisible = usePointLayerStore(state => state.visibleLayerIds.has(layerId));
  const isVisible = usePointLayerStore((state) => {
    const mapLayers = state.visibleLayerIdsByMap[mapId];
    return mapLayers ? mapLayers.has(layerId) : false;
  });

  // Calculate icon size based on zoom
  const getIconSize = (currentZoom: number): number => {
    const baseZoom = 8;
    const baseSize = 18;
    const scaleFactor = 0.15;
    const calculatedSize = baseSize + (currentZoom - baseZoom) * scaleFactor * baseSize;
    return Math.max(8, Math.min(32, Math.round(calculatedSize)));
  };

  const iconSize = getIconSize(zoom);
  const iconElementSize = Math.round(iconSize * 0.67);
  const IconComponent = FaIcons[(config?.icon ?? "") as keyof typeof FaIcons] || FaIcons.FaCircle;

  const customIcon = useMemo(
    () =>
      L.divIcon({
        html: renderToString(
          <div
            className={styles.iconContainer}
            style={{
              width: `${iconSize}px`,
              height: `${iconSize}px`,
              color: config?.color,
            }}
          >
            <IconComponent size={iconElementSize} />
          </div>,
        ),
        className: styles.genericPointMarker,
        iconSize: [iconSize, iconSize],
        iconAnchor: [iconSize / 2, iconSize / 2],
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [iconSize, config?.color, config?.icon],
  );

  // Track zoom level
  useEffect(() => {
    const handleZoom = () => setZoom(map.getZoom());
    map.on("zoomend", handleZoom);
    return () => {
      map.off("zoomend", handleZoom);
    };
  }, [map]);

  // Don't render if not visible, no config, or no data
  if (!isVisible || !config || !data) return null;

  const renderPopupContent = (feature: Feature<Point>) => {
    const title = feature.properties?.[config.popupConfig.titleField] || "";
    const fields = config.popupConfig.fields
      .map((field) => {
        const value = feature.properties?.[field.key];
        if (value === null || value === undefined || value === "") return null;
        return `<b>${field.label}:</b> ${value}<br/>`;
      })
      .filter(Boolean)
      .join("");

    return `<div class="${styles.popupContent}"><b>${title}</b><br/>${fields}</div>`;
  };

  // const createClusterIcon = (cluster: L.MarkerCluster) =>
  //     L.divIcon({
  //         html: `
  //     <div style="
  //     background:${config.color};
  //     width:40px;
  //     height:40px;
  //     border-radius:50%;
  //     display:flex;
  //     align-items:center;
  //     justify-content:center;
  //     color:white;
  //     font-weight:bold;
  //     box-shadow: 0 0 0 4px rgba(0,0,0,0.2);
  //     ">
  //     ${cluster.getChildCount()}
  //     </div>`,
  //         className: "",
  //         iconSize: [40, 40],
  //     });
  const createClusterIcon = (cluster: L.MarkerCluster) =>
    L.divIcon({
      html: renderToString(
        <div
          className={styles.iconContainer}
          style={{
            position: "relative",
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: config.color,
          }}
        >
          {/* POI icon */}
          <div style={{ zIndex: 1 }}>
            <IconComponent size={22} />
          </div>

          {/* Count text ON TOP */}
          <span
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              color: "#fff",
              fontSize: "11px",
              fontWeight: 700,
              pointerEvents: "none",
              zIndex: 2, // 👈 critical

              textShadow: `
                                -1px -1px 0 #000,
                                 1px -1px 0 #000,
                                -1px  1px 0 #000,
                                 1px  1px 0 #000,
                                 0  0  4px rgba(0,0,0,0.9)
                            `,
            }}
          >
            {cluster.getChildCount()}
          </span>
        </div>,
      ),
      className: styles.genericPointMarker,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
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
        {data.features
          .filter(
            (feature) =>
              feature.geometry &&
              feature.geometry.type === "Point" &&
              feature.properties &&
              (feature.properties.objectid || feature.properties.OBJECTID) !== 0,
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
                key={`${config.id}-${featureId}`}
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
