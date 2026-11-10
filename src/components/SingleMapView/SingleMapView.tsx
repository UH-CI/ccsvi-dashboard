import React, { useMemo, useCallback, useRef, useEffect, memo } from "react";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { FeatureCollection, Geometry } from "geojson";
import L from "leaflet";
import { CountyBoundariesProperties } from "../../types";
import { GenericPointMarkers } from "../PointLayers";
import { MapLegend, RasterMapLegend, LegendContainer } from "../MapLegend";
import {
  DEFAULT_BIVARIATE_SCHEME,
  DEFAULT_COLOR_SCHEME,
  MAP_CONFIG,
  sviIsCount,
  sviLabel,
} from "../../config";
import styles from "./SingleMapView.module.scss";
import { ChoroplethLayer } from "../PolygonLayers/ChoroplethLayer/ChoroplethLayer";
import { CountyBoundariesBackgroundLayer } from "../PolygonLayers/CountyBoundariesBackgroundLayer";
import { Chip } from "@mui/material";
import {
  useMapStore,
  useMapConfig,
  useSnapshotStore,
  useFilterStore,
  DEFAULT_LAYER_OPACITIES,
} from "../../stores";
import { useMapLayersStore } from "../../stores/useMapLayersStore";
import { BASE_MAP_OPTIONS } from "../../config/basemaps";
import { HAZARD_LAYERS } from "../../config/hazardLayers";
import { HazardLayerRenderer } from "../HazardLayers";
import { MapRasterLayer } from "../RasterLayers";
import { useMapSnapshot } from "../../hooks/useMapSnapshot";
import { AddressSearch } from "../AddressSearch";
import { useMetricLookups } from "./hooks/useMetricLookups";
import { useMapColorScale } from "./hooks/useMapColorScale";
import { useDatasets } from "../../api/queries/datasets";
import { useBoundary } from "../../api/queries/boundaries";
import { useMetricValues } from "../../api/queries/metricValues";

interface SingleMapViewProps {
  mapId: string;
  isPrimary: boolean;
  mapConfigsLength: number;
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

export const SingleMapView: React.FC<SingleMapViewProps> = memo(
  ({ mapId, isPrimary, mapConfigsLength }) => {
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

    const config = useMapConfig(mapId);

    const blockGroupData = useDatasets();
    const countyBoundaries = useBoundary("counties");

    const setPrimaryMap = useMapStore((state) => state.setPrimaryMap);
    const mapOpacities = useMapStore(
      (state) => state.layerOpacities[mapId] ?? DEFAULT_LAYER_OPACITIES,
    );

    const effectiveDataset = config?.dataset;
    const effectiveDataset2 = config?.dataset2 ?? effectiveDataset;
    const effectiveMetric = config?.metric;
    const effectiveMetric2 = config?.metric2;
    const metricLabel = effectiveMetric ? sviLabel(effectiveDataset, effectiveMetric) : undefined;
    const metricIsCount = effectiveMetric ? sviIsCount(effectiveDataset, effectiveMetric) : false;
    const metricLabel2 = effectiveMetric2
      ? sviLabel(effectiveDataset2, effectiveMetric2)
      : undefined;

    // Register this map's snapshot function
    useEffect(() => {
      const fn = async () => {
        await takeSnapshot(
          {
            activeDataset: effectiveDataset,
            activeDatasetMetric: effectiveMetric,
            customPrefix: `hawaii-census-map-${mapId}`,
            quality: 0.9,
          },
          snapshotWrapperRef,
        );
      };

      registerSnapshot(mapId, fn);
      return () => unregisterSnapshot(mapId);
    }, [
      mapId,
      registerSnapshot,
      unregisterSnapshot,
      takeSnapshot,
      effectiveDataset,
      effectiveMetric,
    ]);

    const visiblePointLayerIds = useMapLayersStore((state) => state.points[mapId]);
    const visibleHazardIds = useMapLayersStore((state) => state.hazards[mapId]);

    useEffect(() => {
      const map = mapRef.current;
      if (!map) return;

      const timeoutId = window.setTimeout(() => {
        if (map.getContainer()) {
          map.invalidateSize();
        }
      }, 200);

      return () => clearTimeout(timeoutId);
    }, [mapConfigsLength, mapRef]);

    const activeDatasetObject = useMemo(() => {
      if (!blockGroupData || !effectiveDataset) return null;
      return blockGroupData[effectiveDataset];
    }, [blockGroupData, effectiveDataset]);

    const shouldShowHawaiianHomelands = useMemo(() => {
      return activeDatasetObject?.hawaiian_homelands || false;
    }, [activeDatasetObject]);

    const activeDatasetMetricObject = useMemo(() => {
      if (!activeDatasetObject || !effectiveMetric) return null;
      return activeDatasetObject.metrics[effectiveMetric];
    }, [activeDatasetObject, effectiveMetric]);

    const cachedMetric1 = useMetricValues(effectiveDataset, effectiveMetric);
    const cachedMetric2 = useMetricValues(effectiveDataset2, effectiveMetric2);

    const { allMetricValues, metric1, allMetricValues2, metric2 } = useMetricLookups(
      cachedMetric1,
      cachedMetric2,
      effectiveMetric,
      effectiveMetric2,
    );

    const activeColorScheme = config?.colorScheme || DEFAULT_COLOR_SCHEME;
    const activeBivariateColorScheme = config?.bivariateColorScheme ?? DEFAULT_BIVARIATE_SCHEME;
    const activeBaseMap =
      BASE_MAP_OPTIONS.find((b) => b.id === config?.baseMap) ?? BASE_MAP_OPTIONS[0];

    const { colorScale, bivariateColorScale, getColor } = useMapColorScale({
      allMetricValues,
      allMetricValues2,
      colorScheme: activeColorScheme,
      bivariateColorScheme: activeBivariateColorScheme,
      hasSecondMetric: Boolean(effectiveMetric2),
      datasetMetricObject: activeDatasetMetricObject,
      isCount: metricIsCount,
    });

    // A filter for block groups can't match Homelands (and vice versa), so drop it when the primary map switches
    const appliedFilter = useFilterStore((s) => s.applied);
    useEffect(() => {
      if (
        isPrimary &&
        appliedFilter?.kind === "areas" &&
        appliedFilter.homelands !== shouldShowHawaiianHomelands
      ) {
        useFilterStore.getState().clearFilter();
      }
    }, [isPrimary, appliedFilter, shouldShowHawaiianHomelands]);

    const shouldRenderCountyBoundariesBackground =
      effectiveDataset && effectiveMetric && shouldShowHawaiianHomelands && countyBoundaries;

    if (!config?.visible) {
      return null;
    }

    return (
      <div className={`${styles["single-map-view"]} ${isPrimary ? styles["primary-map"] : ""}`}>
        <div
          className={`${styles["map-header"]} ${isPrimary ? styles["primary-header"] : styles["inactive-header"]}`}
          onClick={() => !isPrimary && setPrimaryMap(mapId)}
        >
          <div className={styles["map-title-row"]}>
            <h3 className={styles["map-title"]}>{config.title}</h3>
            {isPrimary && <Chip label="Active" size="small" color="primary" />}
          </div>

          <div className={styles["map-right-section"]}>
            <div className={styles["map-info"]}>
              {effectiveDataset && effectiveMetric ? (
                <>
                  <span className={styles["dataset-name"]}>
                    {activeDatasetObject?.label || effectiveDataset.replace(/_/g, " ")}
                  </span>
                  <span className={styles["metric-name"]}>
                    {sviLabel(effectiveDataset, effectiveMetric)}
                  </span>
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

        <div
          ref={snapshotWrapperRef}
          className={styles["map-container"]}
          style={{ position: "relative", zIndex: 1 }}
        >
          <MapContainer
            center={MAP_CONFIG.center}
            zoom={MAP_CONFIG.zoom}
            minZoom={MAP_CONFIG.minZoom}
            maxBounds={MAP_CONFIG.maxBounds}
            maxBoundsViscosity={MAP_CONFIG.maxBoundsViscosity}
            className={styles["leaflet-map"]}
            style={{ zIndex: 1 }}
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
                  <HazardLayerRenderer mapId={mapId} parentId={layer.id} />
                )}

                {/* Render sublayers that are visible */}
                {layer.subLayers?.map((sub) => {
                  const compositeId = `${layer.id}.${sub.id}`;
                  return visibleHazardIds?.has(compositeId) ? (
                    <HazardLayerRenderer
                      key={compositeId}
                      mapId={mapId}
                      parentId={layer.id}
                      layerId={sub.id}
                    />
                  ) : null;
                })}
              </React.Fragment>
            ))}

            <MapRasterLayer mapId={mapId} clickable={!effectiveMetric && !effectiveMetric2} />

            {/* Render point layers - components fetch their own data from store */}
            {Array.from(visiblePointLayerIds ?? []).map((layerId) => (
              <GenericPointMarkers key={layerId} layerId={layerId} mapId={mapId} />
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
              />
            )}
          </LegendContainer>
        </div>
      </div>
    );
  },
);
