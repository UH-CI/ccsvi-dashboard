import React, { useMemo, useCallback, useRef, useEffect, memo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { Feature, FeatureCollection, Geometry, GeoJsonProperties } from "geojson";
import L, { LeafletMouseEvent } from "leaflet";
import {
  BlockGroupProperties,
  HawaiianHomelandProperties,
  CountyBoundariesProperties,
} from "../../types";
import { GenericPointMarkers } from "../PointLayers";
import { MapLegend, RasterMapLegend } from "../MapLegend";
import mapLegendStyles from "../MapLegend/MapLegend.module.scss";
import { MAP_CONFIG } from "../../config";
import styles from "./SingleMapView.module.scss";
import { CensusPolygonLayer } from "../PolygonLayers/CensusPolygonLayer";
import { HawaiianHomelandsPolygonLayer } from "../PolygonLayers/HawaiianHomelandsPolygonLayer";
import { CountyBoundariesBackgroundLayer } from "../PolygonLayers/CountyBoundariesBackgroundLayer";
import { Chip, Snackbar, Alert } from "@mui/material";
import {
  useAppStore,
  useMapStore,
  useMapConfig,
  usePointLayerStore,
  useHazardLayersStore,
  useRasterLayersStore,
  useSnapshotStore,
  DEFAULT_LAYER_OPACITIES,
} from "../../stores";
import { HazardLayerRenderer } from "../HazardLayers";
import { RasterLayerRenderer } from "../RasterLayers";
import { useMapSnapshot } from "../../hooks/useMapSnapshot";
import { AddressSearch } from "../AddressSearch";
import { computeColorScale, computeBivariateColorScale } from "../../utils/colorThresholds";

interface SingleMapViewProps {
  mapId: string;
  isPrimary: boolean;
  mapConfigsLength: number;
}

interface MapResizeHandlerProps {
  onMapRef: (map: L.Map | null) => void;
  onZoomChange?: (zoom: number) => void;
}

const MapResizeHandler: React.FC<MapResizeHandlerProps> = ({ onMapRef, onZoomChange }) => {
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
    if (!onZoomChange) return;

    const handleZoomEnd = () => {
      onZoomChange(map.getZoom());
    };

    // Initialize with current zoom
    onZoomChange(map.getZoom());
    map.on("zoomend", handleZoomEnd);

    return () => {
      map.off("zoomend", handleZoomEnd);
    };
  }, [map, onZoomChange]);

  return null;
};

export const SingleMapView: React.FC<SingleMapViewProps> = memo(
  ({ mapId, isPrimary, mapConfigsLength }) => {
    // Snapshot hook provides the mapRef we should populate + snapshot function
    const { mapRef, takeSnapshot } = useMapSnapshot();

    // Wrapper ref so snapshot includes legend and any overlays in this container
    const snapshotWrapperRef = useRef<HTMLDivElement | null>(null);

    const [mapZoom, setMapZoom] = useState<number>(MAP_CONFIG.zoom);
    const [searchError, setSearchError] = useState<string | null>(null);

    // Snapshot registry store
    const registerSnapshot = useSnapshotStore((s) => s.register);
    const unregisterSnapshot = useSnapshotStore((s) => s.unregister);
    const snapshotOne = useSnapshotStore((s) => s.snapshotOne);

    const config = useMapConfig(mapId);

    const { blockGroupData, metricsData, censusBlockGroups, hawaiianHomelands, countyBoundaries } =
      useAppStore(
        useShallow((state) => ({
          blockGroupData: state.blockGroupData,
          metricsData: state.metricsData,
          censusBlockGroups: state.censusBlockGroups,
          hawaiianHomelands: state.hawaiianHomelands,
          countyBoundaries: state.countyBoundaries,
        })),
      );

    const updateMapActiveFeature = useMapStore((state) => state.updateMapActiveFeature);
    const setPrimaryMap = useMapStore((state) => state.setPrimaryMap);
    const mapOpacities = useMapStore(
      (state) => state.layerOpacities[mapId] ?? DEFAULT_LAYER_OPACITIES,
    );

    const effectiveDataset = config?.dataset;
    const effectiveMetric = config?.metric;
    const effectiveMetric2 = config?.metric2;

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

    const visiblePointLayerIdsByMap = usePointLayerStore((state) => state.visibleLayerIdsByMap);

    // Get hazard layer configs and visible IDs from refactored store
    const hazardLayerConfigs = useHazardLayersStore((state) => state.hazardLayerConfigs);
    const visibleLayerIdsByMap = useHazardLayersStore((state) => state.visibleLayerIdsByMap);

    // Get raster layer configs and visible IDs from refactored store
    const rasterLayerConfigs = useRasterLayersStore((state) => state.rasterLayerConfigs);
    const visibleRasterLayerIdsByMap = useRasterLayersStore((state) => state.visibleLayerIdsByMap);
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
    
    const metricsDerived = useMemo(() => {
      const noData = {
        allMetricValues: [] as number[],
        getMetricValue: (): number | null => null,
        allMetricValues2: [] as number[],
        getMetricValue2: null as ((geoid: string) => number | null) | null,
      };

      if (!metricsData || !effectiveDataset || !effectiveMetric) return noData;

      const lookup1 = new Map<string, number>();
      const lookup2 = effectiveMetric2 ? new Map<string, number>() : null;
      const values1: number[] = [];
      const values2: number[] = [];

      for (const [geoid, data] of Object.entries(metricsData)) {
        const datasetMetrics = data.metrics?.[effectiveDataset];

        const v1 = datasetMetrics?.[effectiveMetric]?.proportion;
        if (v1 !== undefined && v1 !== null) {
          lookup1.set(geoid, v1);
          values1.push(v1);
        }

        if (lookup2 && effectiveMetric2) {
          const v2 = datasetMetrics?.[effectiveMetric2]?.proportion;
          if (v2 !== undefined && v2 !== null) {
            lookup2.set(geoid, v2);
            values2.push(v2);
          }
        }
      }

      return {
        allMetricValues: values1,
        getMetricValue: (geoid: string): number | null => lookup1.get(geoid) ?? null,
        allMetricValues2: values2,
        getMetricValue2: lookup2
          ? (geoid: string): number | null => lookup2.get(geoid) ?? null
          : null,
      };
    }, [metricsData, effectiveDataset, effectiveMetric, effectiveMetric2]);

    const { allMetricValues, getMetricValue, allMetricValues2, getMetricValue2 } = metricsDerived;

    const activeColorScheme = config?.colorScheme || "Viridis";
    const activeBivariateColorScheme = config?.bivariateColorScheme || "PurpleBlue";

    const colorScale = useMemo(() => {
      if (!activeDatasetMetricObject) return null;
      return computeColorScale(
        allMetricValues,
        activeColorScheme,
        activeDatasetMetricObject.classificationMode ?? "q",
      );
    }, [allMetricValues, activeColorScheme, activeDatasetMetricObject]);

    const bivariateColorScale = useMemo(() => {
      if (!effectiveMetric2 || allMetricValues2.length === 0) return null;
      return computeBivariateColorScale(
        allMetricValues,
        allMetricValues2,
        activeBivariateColorScheme,
        activeDatasetMetricObject?.classificationMode ?? "q",
      );
    }, [allMetricValues, allMetricValues2, activeBivariateColorScheme, activeDatasetMetricObject, effectiveMetric2]);

    const getColor = useMemo(() => {
      if (bivariateColorScale) {
        return (value1: number | null, value2?: number | null): string =>
          bivariateColorScale.getColor(value1, value2 ?? null);
      }
      return (value: number | null): string => {
        if (value === null || !colorScale) return "#cccccc";
        return colorScale.getColor(value);
      };
    }, [colorScale, bivariateColorScale]);

    const handleFeatureClick = useCallback(
      (
        feature: Feature<Geometry, BlockGroupProperties | HawaiianHomelandProperties> | null,
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

    const handleAddressSearchResult = useCallback(
      (geoid: string, lat: number, lng: number) => {
        const map = mapRef.current;
        const zoom = map?.getZoom() ?? MAP_CONFIG.zoom;

        updateMapActiveFeature(mapId, {
          geoid,
          lat,
          lng,
          zoom,
        });
      },
      [mapId, updateMapActiveFeature],
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
                    {effectiveDataset.replace(/_/g, " ").toUpperCase()}
                  </span>
                  <span className={styles["metric-name"]}>{effectiveMetric}</span>
                </>
              ) : (
                <span className={styles["empty-state"]}>Select dataset and metric</span>
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
            <MapResizeHandler
              onMapRef={(map) => {
                mapRef.current = map;
              }}
              onZoomChange={(z) => {
                setMapZoom(z);
              }}
            />

            <AddressSearch
              features={
                shouldShowHawaiianHomelands
                  ? ((hawaiianHomelands as FeatureCollection<Geometry, GeoJsonProperties>) ?? null)
                  : ((censusBlockGroups as FeatureCollection<Geometry, GeoJsonProperties>) ?? null)
              }
              geoidProperty={shouldShowHawaiianHomelands ? "GEOID10" : "geoid20"}
              onBlockGroupFound={handleAddressSearchResult}
              onSearchError={setSearchError}
            />

            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap contributors"
            />

            {shouldRenderCountyBoundariesBackground && (
              <CountyBoundariesBackgroundLayer
                data={countyBoundaries as FeatureCollection<Geometry, CountyBoundariesProperties>}
                mapId={config.id}
                layerOpacity={mapOpacities.countyBoundaries}
              />
            )}

            {shouldRenderCensus && (
              <CensusPolygonLayer
                data={censusBlockGroups as FeatureCollection<Geometry, BlockGroupProperties>}
                metricsData={metricsData}
                getMetricValue={getMetricValue}
                getMetricValue2={getMetricValue2 ?? undefined}
                mapId={config.id}
                activeMetric={effectiveMetric}
                activeMetric2={effectiveMetric2 ?? undefined}
                activeFeatureGeoid={config.activeFeature?.geoid}
                layerOpacity={mapOpacities.census}
                getColor={getColor}
                onFeatureClick={handleFeatureClick}
              />
            )}

            {shouldRenderHawaiianHomelands && (
              <HawaiianHomelandsPolygonLayer
                data={hawaiianHomelands as FeatureCollection<Geometry, HawaiianHomelandProperties>}
                metricsData={metricsData}
                getMetricValue={getMetricValue}
                getMetricValue2={getMetricValue2 ?? undefined}
                mapId={config.id}
                activeMetric={effectiveMetric}
                activeMetric2={effectiveMetric2 ?? undefined}
                activeFeatureGeoid={config.activeFeature?.geoid}
                layerOpacity={mapOpacities.hawaiianHomelands}
                getColor={getColor}
                onFeatureClick={handleFeatureClick}
              />
            )}

            {/* Render hazard layers based on visibility state */}
            {hazardLayerConfigs.map((layer) => (
              <React.Fragment key={layer.id}>
                {/* Render parent layer if it has a filePath and is visible */}
                {layer.filePath && visibleLayerIdsByMap[mapId]?.has(layer.id) && (
                  <HazardLayerRenderer mapId={mapId} parentId={layer.id} />
                )}

                {/* Render sublayers that are visible */}
                {layer.subLayers?.map((sub) => {
                  const compositeId = `${layer.id}.${sub.id}`;
                  return visibleLayerIdsByMap[mapId]?.has(compositeId) ? (
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

            {/* Render raster layers based on visibility state */}
            {rasterLayerConfigs.map((layer) => (
              <React.Fragment key={layer.id}>
                {/* Render parent layer if it has a filePath and is visible */}
                {layer.filePath && visibleRasterIds.has(layer.id) && (
                  <RasterLayerRenderer mapId={mapId} parentId={layer.id} mapZoom={mapZoom} />
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
              <GenericPointMarkers key={layerId} layerId={layerId} mapId={mapId} />
            ))}
          </MapContainer>

          <div className={mapLegendStyles.legendStack}>
            <RasterMapLegend mapId={mapId} />
            <MapLegend
              limits={colorScale?.limits ?? null}
              colors={colorScale?.getLegendColors() ?? null}
              bivariate={bivariateColorScale ?? undefined}
              metric1Label={effectiveMetric ?? undefined}
              metric2Label={effectiveMetric2 ?? undefined}
            />
          </div>
        </div>

        <Snackbar
          open={!!searchError}
          autoHideDuration={4000}
          onClose={() => setSearchError(null)}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert severity="warning" onClose={() => setSearchError(null)} variant="filled">
            {searchError}
          </Alert>
        </Snackbar>
      </div>
    );
  },
);
