import React, { useCallback, useRef, useEffect, memo } from "react";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { FeatureCollection, Geometry } from "geojson";
import L from "leaflet";
import { CountyBoundariesProperties } from "../../types";
import { GenericPointMarkers } from "../PointLayers/PointLayers";
import { MapLegend } from "../MapLegend/MapLegend";
import { RasterMapLegend } from "../MapLegend/RasterMapLegend";
import { LegendContainer } from "../MapLegend/LegendContainer";
import { DEFAULT_BIVARIATE_SCHEME, noValueFill } from "../../config/colorSchemes";
import { MAP_CONFIG } from "../../config/map";
import { sviLabel } from "../../config/sviCategories";
import { NoValuePattern } from "./NoValuePattern";
import styles from "./SingleMapView.module.scss";
import { ChoroplethLayer } from "../PolygonLayers/ChoroplethLayer/ChoroplethLayer";
import { CountyBoundariesBackgroundLayer } from "../PolygonLayers/CountyBoundariesBackgroundLayer/CountyBoundariesBackgroundLayer";
import { Chip } from "@mui/material";
import { useMapStore, useMapState, DEFAULT_LAYER_OPACITIES } from "../../stores/useMapStore";
import { useSnapshotStore } from "../../stores/useSnapshotStore";
import { useMapLayersStore } from "../../stores/useMapLayersStore";
import { BASE_MAP_OPTIONS } from "../../config/basemaps";
import { HAZARD_LAYERS } from "../../config/hazardLayers";
import { pointLayer } from "../../config/pointLayers";
import { subLayerId } from "../../config/layerFiles";
import { HazardLayerRenderer } from "../HazardLayers/HazardLayerRenderer";
import { MapRasterLayer } from "../RasterLayers/RasterLayerRenderer";
import { useMapSnapshot } from "../../hooks/useMapSnapshot";
import { AddressSearch } from "../AddressSearch/AddressSearch";
import { useMetricLookups } from "./hooks/useMetricLookups";
import { useMapColorScale } from "./hooks/useMapColorScale";
import { useMetric } from "../../api/queries/metrics";
import { useBoundary } from "../../api/queries/boundaries";
import { useMetricValues } from "../../api/queries/metricValues";

interface SingleMapViewProps {
  mapId: string;
  isPrimary: boolean;
}

interface MapResizeHandlerProps {
  onMapRef: (map: L.Map | null) => void;
}

const MapResizeHandler: React.FC<MapResizeHandlerProps> = ({ onMapRef }) => {
  const map = useMap();
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    containerRef.current = map.getContainer();
    onMapRef(map);

    const timeoutId = window.setTimeout(() => {
      if (map && map.getContainer()) {
        map.invalidateSize();
      }
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      onMapRef(null);
    };
  }, [map, onMapRef]);

  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      setTimeout(() => {
        map.invalidateSize();
      }, 50);
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [map]);

  return null;
};

export const SingleMapView: React.FC<SingleMapViewProps> = memo(({ mapId, isPrimary }) => {
  // Snapshot hook provides the mapRef we should populate + snapshot function
  const { mapRef, takeSnapshot } = useMapSnapshot();

  // Wrapper ref so snapshot includes legend and any overlays in this container
  const snapshotWrapperRef = useRef<HTMLDivElement | null>(null);

  const handleMapRef = useCallback(
    (map: L.Map | null) => {
      mapRef.current = map;
    },
    [mapRef],
  );

  // Snapshot registry store
  const registerSnapshot = useSnapshotStore((s) => s.register);
  const unregisterSnapshot = useSnapshotStore((s) => s.unregister);
  const snapshotOne = useSnapshotStore((s) => s.snapshotOne);

  // Drawn only for a map in the store that's shown
  const config = useMapState(mapId)!;

  const countyBoundaries = useBoundary("counties");

  const setPrimaryMap = useMapStore((state) => state.setPrimaryMap);
  const mapOpacities = useMapStore(
    (state) => state.layerOpacities[mapId] ?? DEFAULT_LAYER_OPACITIES,
  );

  // The indicator's and the comparison indicator's keys
  const metricKey = config.metric || undefined;
  const metricKey2 = config.metric2;
  const metricInfo = useMetric(metricKey);
  const metricInfo2 = useMetric(metricKey2);
  const metricLabel = metricKey ? sviLabel(metricKey) : undefined;
  const metricLabel2 = metricKey2 ? sviLabel(metricKey2) : undefined;
  const metricIsCount = metricInfo?.kind === "count";

  // Register this map's snapshot function
  useEffect(() => {
    const fn = async () => {
      await takeSnapshot(
        {
          activeDataset: metricInfo?.datasetId,
          activeDatasetMetric: metricInfo?.name,
          customPrefix: `hawaii-census-map-${mapId}`,
          quality: 0.9,
        },
        snapshotWrapperRef,
      );
    };

    registerSnapshot(mapId, fn);
    return () => unregisterSnapshot(mapId);
  }, [mapId, registerSnapshot, unregisterSnapshot, takeSnapshot, metricInfo]);

  const visiblePointLayerIds = useMapLayersStore((state) => state.points[mapId]);
  const visibleHazardIds = useMapLayersStore((state) => state.hazards[mapId]);

  const shouldShowHawaiianHomelands = metricInfo?.dataset.hawaiian_homelands ?? false;

  const cachedMetric1 = useMetricValues(metricKey);
  const cachedMetric2 = useMetricValues(metricKey2);

  const { allMetricValues, metric1, allMetricValues2, metric2 } = useMetricLookups(
    cachedMetric1,
    cachedMetric2,
    metricInfo?.kind,
    metricInfo2?.kind,
  );

  const activeBivariateColorScheme = config.bivariateColorScheme ?? DEFAULT_BIVARIATE_SCHEME;
  const activeBaseMap = BASE_MAP_OPTIONS.find((b) => b.id === config.baseMap)!;

  const { colorScale, bivariateColorScale, getColor } = useMapColorScale({
    allMetricValues,
    allMetricValues2,
    colorScheme: config.colorScheme,
    bivariateColorScheme: activeBivariateColorScheme,
    hasSecondMetric: Boolean(metricKey2),
    hasMetric: Boolean(metricInfo),
    isCount: metricIsCount,
    noValueFill: noValueFill(mapId),
  });

  const shouldRenderCountyBoundariesBackground =
    metricInfo && shouldShowHawaiianHomelands && countyBoundaries;

  return (
    <div className={`${styles["single-map-view"]} ${isPrimary ? styles["primary-map"] : ""}`}>
      <div
        className={`${styles["map-header"]} ${isPrimary ? "" : styles["inactive-header"]}`}
        onClick={() => !isPrimary && setPrimaryMap(mapId)}
      >
        <div className={styles["map-title-row"]}>
          <h3 className={styles["map-title"]}>{config.title}</h3>
          {isPrimary && <Chip label="Active" size="small" color="primary" />}
        </div>

        <div className={styles["map-right-section"]}>
          <div className={styles["map-info"]}>
            {metricInfo ? (
              <>
                <span className={styles["dataset-name"]}>
                  {metricInfo.dataset.label || metricInfo.datasetId.replace(/_/g, " ")}
                </span>
                <span className={styles["metric-name"]}>{metricLabel}</span>
              </>
            ) : (
              <span className={styles["empty-state"]}>Select dataset and metric</span>
            )}
          </div>

          <AddressSearch mapRef={mapRef} />

          <button
            type="button"
            className={styles["snapshot-btn"]}
            onClick={(e) => {
              e.stopPropagation();
              void snapshotOne(mapId);
            }}
            title="Save snapshot"
            aria-label="Save snapshot"
          >
            <CameraAltIcon fontSize="small" />
          </button>
        </div>
      </div>

      <div ref={snapshotWrapperRef} className={styles["map-container"]}>
        <NoValuePattern mapId={mapId} />
        <MapContainer
          center={MAP_CONFIG.center}
          zoom={MAP_CONFIG.zoom}
          minZoom={MAP_CONFIG.minZoom}
          maxBounds={MAP_CONFIG.maxBounds}
          maxBoundsViscosity={MAP_CONFIG.maxBoundsViscosity}
          className={styles["leaflet-map"]}
        >
          <MapResizeHandler onMapRef={handleMapRef} />

          <TileLayer
            key={activeBaseMap.id}
            url={activeBaseMap.url}
            attribution={activeBaseMap.attribution}
            maxNativeZoom={activeBaseMap.maxNativeZoom}
            maxZoom={activeBaseMap.maxZoom ?? 18}
          />

          {shouldRenderCountyBoundariesBackground && (
            <CountyBoundariesBackgroundLayer
              data={countyBoundaries as FeatureCollection<Geometry, CountyBoundariesProperties>}
              mapId={config.id}
              layerOpacity={mapOpacities.countyBoundaries}
            />
          )}

          {metricLabel && cachedMetric1 && (
            <ChoroplethLayer
              mapId={mapId}
              homelands={shouldShowHawaiianHomelands}
              metric1={metric1}
              metric2={metric2}
              label1={metricLabel}
              label2={metricLabel2}
              getColor={getColor}
            />
          )}

          {/* Render hazard layers based on visibility state */}
          {HAZARD_LAYERS.map((layer) => (
            <React.Fragment key={layer.id}>
              {/* Render parent layer if it has a file and is visible */}
              {layer.file && visibleHazardIds?.has(layer.id) && (
                <HazardLayerRenderer layer={layer} name={layer.name} />
              )}

              {/* Render sublayers that are visible */}
              {layer.subLayers?.map((sub) => {
                const compositeId = subLayerId(layer.id, sub.id);
                return visibleHazardIds?.has(compositeId) ? (
                  <HazardLayerRenderer
                    key={compositeId}
                    layer={sub}
                    name={`${layer.name} – ${sub.name}`}
                  />
                ) : null;
              })}
            </React.Fragment>
          ))}

          <MapRasterLayer mapId={mapId} clickable={!metricKey && !metricKey2} />

          {/* The point layers that are on */}
          {Array.from(visiblePointLayerIds ?? []).map((layerId) => (
            <GenericPointMarkers key={layerId} config={pointLayer(layerId)} />
          ))}
        </MapContainer>

        <LegendContainer>
          <RasterMapLegend mapId={mapId} />
          {metricLabel && (
            <MapLegend
              title={metricLabel2 ? `${metricLabel} × ${metricLabel2}` : metricLabel}
              limits={colorScale?.limits ?? null}
              colors={colorScale?.getLegendColors() ?? null}
              bivariate={bivariateColorScale ?? undefined}
              metric1Label={metricLabel}
              metric2Label={metricLabel2}
              isCount={metricIsCount}
              noValueFill={noValueFill(mapId)}
            />
          )}
        </LegendContainer>
      </div>
    </div>
  );
});
