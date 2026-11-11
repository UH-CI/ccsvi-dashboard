import React, { useState, useEffect, useMemo } from "react";
import { Marker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { renderToString } from "react-dom/server";
import * as FaIcons from "react-icons/fa";
import L from "leaflet";
import "leaflet.markercluster";
import { Feature, Point } from "geojson";
import styles from "./PointLayers.module.scss";
import { useMapLayersStore } from "../../stores/useMapLayersStore";
import { POINT_LAYERS } from "../../config/pointLayers";
import { usePointFilter } from "../../api/queries/filter";
import { useFilteredPoints, usePointFile } from "../../api/queries/points";

interface GenericPointMarkersProps {
  layerId: string;
  mapId: string;
}

function pointId(properties: Feature["properties"], idFields: string[]): string | undefined {
  const values = idFields.map((field) => properties?.[field]);
  if (values.some((value) => value == null)) return undefined;
  return values.join("|");
}

// Which of this layer's points passed the last Filter press.
// Returns nothing when this layer isn't being filtered, meaning show all its points.
function useMatchingIds(layerId: string): Set<string> | null {
  const criteria = usePointFilter(layerId);
  const points = useFilteredPoints(layerId, criteria);
  const { idFields } = POINT_LAYERS.find((c) => c.id === layerId)!;

  return useMemo(() => {
    if (criteria === null) return null;
    // No neighborhoods matched, so show no points without asking the server
    if (criteria?.noAreasMatched) return new Set();
    if (!points) return null;
    return new Set(
      points.features
        .map((f) => pointId(f.properties, idFields))
        .filter((id): id is string => id !== undefined),
    );
  }, [criteria, points, idFields]);
}

export const GenericPointMarkers: React.FC<GenericPointMarkersProps> = ({ layerId, mapId }) => {
  const map = useMap() as L.Map;
  const [zoom, setZoom] = useState(map.getZoom());

  const config = POINT_LAYERS.find((c) => c.id === layerId);
  const data = usePointFile(layerId);
  const matchingIds = useMatchingIds(layerId);
  const isVisible = useMapLayersStore((state) => state.points[mapId]?.has(layerId) ?? false);

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
            className={styles["icon-container"]}
            style={{
              width: `${iconSize}px`,
              height: `${iconSize}px`,
              color: config?.color,
            }}
          >
            <IconComponent size={iconElementSize} />
          </div>,
        ),
        className: styles["generic-point-marker"],
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

  // The title column's value, then every column with a value
  const renderPopupContent = (feature: Feature<Point>) => (
    <div>
      <h3>{String(feature.properties?.[config.popupConfig.titleField] || "")}</h3>
      {Object.entries(feature.properties ?? {})
        .filter(([, value]) => value !== null && value !== undefined && value !== "")
        .map(([key, value]) => (
          <React.Fragment key={key}>
            <strong>{key}:</strong> {String(value)}
            <br />
          </React.Fragment>
        ))}
    </div>
  );

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
          className={`${styles["icon-container"]} ${styles["cluster"]}`}
          style={{ color: config.color }}
        >
          {/* POI icon */}
          <div className={styles["cluster-icon"]}>
            <IconComponent size={22} />
          </div>

          {/* Count text ON TOP */}
          <span className={styles["cluster-count"]}>{cluster.getChildCount()}</span>
        </div>,
      ),
      className: styles["generic-point-marker"],
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
              feature.properties,
          )
          .map((feature, index) => {
            const featureId = pointId(feature.properties, config.idFields);

            // A filter is running and this point isn't in its result — hide it
            if (matchingIds && (featureId === undefined || !matchingIds.has(featureId))) return null;

            const coords = feature.geometry.coordinates;
            if (!coords || coords.length < 2) return null; // skip invalid

            const [longitude, latitude] = coords;

            return (
              <Marker
                key={`${config.id}-${index}`}
                position={[latitude, longitude]}
                icon={customIcon}
              >
                <Popup>{renderPopupContent(feature)}</Popup>
              </Marker>
            );
          })}
      </MarkerClusterGroup>
    </>
  );
};
