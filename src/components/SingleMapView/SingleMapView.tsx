import React, {
  useMemo,
  useCallback,
  useRef,
  useEffect,
  memo,
  useState,
} from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { Feature, FeatureCollection, Geometry } from "geojson";
import L, { LeafletMouseEvent } from "leaflet";
import {
  BlockGroupProperties,
  HawaiianHomelandProperties,
  CountyBoundariesProperties,
} from "../../types";
import { GenericPointMarkers } from "../PointLayers";
import { MapLegend } from "../MapLegend";
import { MAP_CONFIG } from "../../config";
import styles from "./SingleMapView.module.scss";
import { CensusPolygonLayer } from "../PolygonLayers/CensusPolygonLayer";
import { HawaiianHomelandsPolygonLayer } from "../PolygonLayers/HawaiianHomelandsPolygonLayer";
import { CountyBoundariesBackgroundLayer } from "../PolygonLayers/CountyBoundariesBackgroundLayer";
import { Chip } from "@mui/material";
import {
  useAppStore,
  useMapStore,
  useMapConfig,
  usePointLayerStore,
  useHazardLayersStore,
  useRasterLayersStore,
  useSnapshotStore,
} from "../../stores";
import { HazardLayerRenderer } from "../HazardLayers/HazardLayerRenderer";
import { RasterLayerRenderer } from "../RasterLayers";
import { useMapSnapshot } from "../../hooks/useMapSnapshot";

interface SingleMapViewProps {
  mapId: string;
  isPrimary: boolean;
  mapConfigsLength: number;
}

const MapResizeHandler = ({
  onMapRef,
}: {
  onMapRef: (map: L.Map | null) => void;
}) => {
  const map = useMap();
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    containerRef.current = map.getContainer();
    onMapRef(map);

    const timeoutId = setTimeout(() => {
      map.invalidateSize();
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

  useEffect(() => {
    const handleResize = () => {
      setTimeout(() => {
        map.invalidateSize();
      }, 100);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [map]);

  return null;
};

export const SingleMapView: React.FC<SingleMapViewProps> = memo(
  ({ mapId, isPrimary, mapConfigsLength }) => {
    // Snapshot hook provides the mapRef we should populate + snapshot function
    const { mapRef, takeSnapshot } = useMapSnapshot();

    // Wrapper ref so snapshot includes legend and any overlays in this container
    const snapshotWrapperRef = useRef<HTMLDivElement | null>(null);

    const [mapZoom, setMapZoom] = useState<number>(MAP_CONFIG.zoom);

    // Snapshot registry store
    const registerSnapshot = useSnapshotStore((s) => s.register);
    const unregisterSnapshot = useSnapshotStore((s) => s.unregister);
    const snapshotOne = useSnapshotStore((s) => s.snapshotOne);

    const config = useMapConfig(mapId);

    const {
      blockGroupData,
      metricsData,
      censusBlockGroups,
      hawaiianHomelands,
      countyBoundaries,
    } = useAppStore();

    const { updateMapActiveFeature, setPrimaryMap } = useMapStore();

    const effectiveDataset = config?.dataset;
    const effectiveMetric = config?.metric;

    // Register this map’s snapshot function
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

    // Track zoom changes
    useEffect(() => {
      if (!mapRef.current) return;

      const map = mapRef.current;

      const onZoomEnd = () => {
        const z = map.getZoom();
        console.log("[SingleMapView] zoom =", z);
        setMapZoom(z);
      };

      map.on("zoomend", onZoomEnd);
      setMapZoom(map.getZoom());

      return () => {
        map.off("zoomend", onZoomEnd);
      };
    }, [mapRef]);

    const visiblePointLayerIdsByMap = usePointLayerStore(
      (state) => state.visibleLayerIdsByMap,
    );

    // Get hazard layer configs and visible IDs from refactored store
    const hazardLayerConfigs = useHazardLayersStore(
      (state) => state.hazardLayerConfigs,
    );
    const visibleHazardIds = useHazardLayersStore(
      (state) => state.visibleLayerIds,
    );

    // Get raster layer configs and visible IDs from refactored store
    const rasterLayerConfigs = useRasterLayersStore(
      (state) => state.rasterLayerConfigs,
    );
    const visibleRasterLayerIdsByMap = useRasterLayersStore(
      (state) => state.visibleLayerIdsByMap,
    );
    const visibleRasterIds = useMemo(
      () => visibleRasterLayerIdsByMap[mapId] ?? new Set<string>(),
      [visibleRasterLayerIdsByMap, mapId],
    );

    useEffect(() => {
      if (mapRef.current) {
        const timeoutId = setTimeout(() => {
          mapRef.current?.invalidateSize();
        }, 200);
        return () => clearTimeout(timeoutId);
      }
    }, [mapConfigsLength, mapRef]);

    const visiblePointLayerIds = useMemo(
      () => visiblePointLayerIdsByMap[mapId] ?? new Set<string>(),
      [visiblePointLayerIdsByMap, mapId],
    );

    const activeDatasetObject = useMemo(() => {
      if (!blockGroupData || !effectiveDataset) return null;
      return blockGroupData[effectiveDataset];
    }, [blockGroupData, effectiveDataset]);

    const shouldShowHawaiianHomelands = useMemo(() => {
      return activeDatasetObject?.hawaiianHomelands || false;
    }, [activeDatasetObject]);

    const activeDatasetMetricObject = useMemo(() => {
      if (!activeDatasetObject || !effectiveMetric) return null;
      return activeDatasetObject.columnThresholds[effectiveMetric];
    }, [activeDatasetObject, effectiveMetric]);

    const getMetricValue = useMemo(() => {
      if (!metricsData || !effectiveDataset || !effectiveMetric) {
        return () => null;
      }

      const lookup = new Map<string, number>();
      Object.entries(metricsData).forEach(([geoid, data]) => {
        const metricObj = data.metrics?.[effectiveDataset]?.[effectiveMetric];
        const value = metricObj?.proportion;
        if (value !== undefined && value !== null) {
          lookup.set(geoid, value);
        }
      });

      return (geoid: string): number | null => {
        if (!geoid) return null;
        return lookup.get(geoid) ?? null;
      };
    }, [metricsData, effectiveDataset, effectiveMetric]);

    const activeColorScheme = config?.colorScheme || "viridis";

    const getColor = useMemo(() => {
      return (value: number | null): string => {
        if (value === null || !activeDatasetMetricObject) {
          return "#cccccc";
        }
        const { thresholds, colorSchemes } = activeDatasetMetricObject;
        const colors = colorSchemes[activeColorScheme];
        for (let i = 0; i < thresholds.length; i++) {
          if (value <= thresholds[i]) {
            return colors[i];
          }
        }
        return "#333";
      };
    }, [activeDatasetMetricObject, activeColorScheme]);

    const handleFeatureClick = useCallback(
      (
        feature: Feature<
          Geometry,
          BlockGroupProperties | HawaiianHomelandProperties
        > | null,
        e: LeafletMouseEvent,
      ) => {
        const layer = e.target;
        layer.bringToFront();

        if (!feature) return;

        // Extract geoid - check both census and homelands properties
        const geoid =
          (feature.properties as BlockGroupProperties)?.geoid20 ||
          (feature.properties as HawaiianHomelandProperties)?.GEOID10;
        if (!geoid) return;

        const map = mapRef.current;
        if (!map) return;

        const center = map.getCenter();
        const zoom = map.getZoom();

        updateMapActiveFeature(mapId, {
          geoid,
          lat: center.lat,
          lng: center.lng,
          zoom: zoom,
        });

        const bounds = layer.getBounds();
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [20, 20] });
        }
      },
      [mapId, updateMapActiveFeature, mapRef],
    );

    const shouldRenderCensus =
      effectiveDataset &&
      effectiveMetric &&
      censusBlockGroups &&
      metricsData &&
      blockGroupData &&
      !shouldShowHawaiianHomelands;

    const shouldRenderHawaiianHomelands =
      effectiveDataset &&
      effectiveMetric &&
      shouldShowHawaiianHomelands &&
      hawaiianHomelands &&
      metricsData;

    const shouldRenderCountyBoundariesBackground =
      effectiveDataset &&
      effectiveMetric &&
      shouldShowHawaiianHomelands &&
      countyBoundaries;

    if (!config?.visible) {
      return null;
    }

    return (
      <div
        className={`${styles["single-map-view"]} ${isPrimary ? styles["primary-map"] : ""}`}
      >
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
                    {effectiveDataset.replace(/_/g, " ").toUpperCase()}
                  </span>
                  <span className={styles["metric-name"]}>
                    {effectiveMetric}
                  </span>
                </>
              ) : (
                <span className={styles["empty-state"]}>
                  Select dataset and metric
                </span>
              )}
            </div>

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
              📸
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
            <MapResizeHandler
              onMapRef={(map) => {
                mapRef.current = map;
              }}
            />

            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />

            {shouldRenderCountyBoundariesBackground && (
              <CountyBoundariesBackgroundLayer
                data={
                  countyBoundaries as FeatureCollection<
                    Geometry,
                    CountyBoundariesProperties
                  >
                }
                mapId={config.id}
              />
            )}

            {shouldRenderCensus && (
              <CensusPolygonLayer
                data={
                  censusBlockGroups as FeatureCollection<
                    Geometry,
                    BlockGroupProperties
                  >
                }
                metricsData={metricsData}
                getMetricValue={getMetricValue}
                mapId={config.id}
                activeMetric={effectiveMetric}
                activeFeatureGeoid={config.activeFeature?.geoid}
                getColor={getColor}
                onFeatureClick={handleFeatureClick}
              />
            )}

            {shouldRenderHawaiianHomelands && (
              <HawaiianHomelandsPolygonLayer
                data={
                  hawaiianHomelands as FeatureCollection<
                    Geometry,
                    HawaiianHomelandProperties
                  >
                }
                metricsData={metricsData}
                getMetricValue={getMetricValue}
                mapId={config.id}
                activeMetric={effectiveMetric}
                activeFeatureGeoid={config.activeFeature?.geoid}
                getColor={getColor}
                onFeatureClick={handleFeatureClick}
              />
            )}

            {/* Render hazard layers based on visibility state */}
            {hazardLayerConfigs.map((layer) => (
              <React.Fragment key={layer.id}>
                {/* Render parent layer if it has a filePath and is visible */}
                {layer.filePath && visibleHazardIds.has(layer.id) && (
                  <HazardLayerRenderer parentId={layer.id} />
                )}

                {/* Render sublayers that are visible */}
                {layer.subLayers?.map((sub) => {
                  const compositeId = `${layer.id}.${sub.id}`;
                  return visibleHazardIds.has(compositeId) ? (
                    <HazardLayerRenderer
                      key={compositeId}
                      parentId={layer.id}
                      layerId={sub.id}
                    />
                  ) : null;
                })}
              </React.Fragment>
            ))}

            {/* Render raster layers based on visibility state */}
            {rasterLayerConfigs.map((layer) => (
              <React.Fragment key={layer.id}>
                {/* Render parent layer if it has a filePath and is visible */}
                {layer.filePath && visibleRasterIds.has(layer.id) && (
                  <RasterLayerRenderer
                    mapId={mapId}
                    parentId={layer.id}
                    mapZoom={mapZoom}
                  />
                )}

                {/* Render sublayers that are visible */}
                {layer.subLayers?.map((sub) => {
                  const compositeId = `${layer.id}.${sub.id}`;
                  return visibleRasterIds.has(compositeId) ? (
                    <RasterLayerRenderer
                      key={compositeId}
                      mapId={mapId}
                      parentId={layer.id}
                      layerId={sub.id}
                      mapZoom={mapZoom}
                    />
                  ) : null;
                })}
              </React.Fragment>
            ))}

            {/* Render point layers - components fetch their own data from store */}
            {Array.from(visiblePointLayerIds).map((layerId) => (
              <GenericPointMarkers
                key={layerId}
                layerId={layerId}
                mapId={mapId}
              />
            ))}
          </MapContainer>

          <MapLegend
            dataset={blockGroupData}
            activeDataset={effectiveDataset}
            activeDatasetMetric={effectiveMetric}
            colorScheme={activeColorScheme}
          />
        </div>
      </div>
    );
  },
);
