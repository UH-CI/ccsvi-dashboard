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
import { MapLegend, RasterMapLegend, LegendContainer } from "../MapLegend";
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

    // Snapshot registry store
    const registerSnapshot = useSnapshotStore((s) => s.register);
    const unregisterSnapshot = useSnapshotStore((s) => s.unregister);
    const snapshotOne = useSnapshotStore((s) => s.snapshotOne);

    const config = useMapConfig(mapId);

    const { blockGroupData, metricValuesCache, geographiesData, censusBlockGroups, hawaiianHomelands, countyBoundaries } =
      useAppStore(
        useShallow((state) => ({
          blockGroupData: state.blockGroupData,
          metricValuesCache: state.metricValuesCache,
          geographiesData: state.geographiesData,
          censusBlockGroups: state.censusBlockGroups,
          hawaiianHomelands: state.hawaiianHomelands,
          countyBoundaries: state.countyBoundaries,
        })),
      );
    const fetchMetricValues = useAppStore((state) => state.fetchMetricValues);

    const updateMapActiveFeature = useMapStore((state) => state.updateMapActiveFeature);
    const setPrimaryMap = useMapStore((state) => state.setPrimaryMap);
    const mapOpacities = useMapStore(
      (state) => state.layerOpacities[mapId] ?? DEFAULT_LAYER_OPACITIES,
    );

    const effectiveDataset = config?.dataset;
    const effectiveDataset2 = config?.dataset2 ?? effectiveDataset;
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
    
    const cacheKey1 = effectiveDataset && effectiveMetric
      ? `${effectiveDataset}::${effectiveMetric}`
      : null;
    const cacheKey2 = effectiveDataset2 && effectiveMetric2
      ? `${effectiveDataset2}::${effectiveMetric2}`
      : null;
    const cachedMetric1 = cacheKey1 ? metricValuesCache[cacheKey1] : null;
    const cachedMetric2 = cacheKey2 ? metricValuesCache[cacheKey2] : null;

    useEffect(() => {
      if (!effectiveDataset) return;
      if (effectiveMetric) void fetchMetricValues(effectiveDataset, effectiveMetric);
      if (effectiveMetric2 && effectiveDataset2) void fetchMetricValues(effectiveDataset2, effectiveMetric2);
    }, [effectiveDataset, effectiveDataset2, effectiveMetric, effectiveMetric2, fetchMetricValues]);

    const metricsDerived = useMemo(() => {
      const noData = {
        allMetricValues: [] as number[],
        getMetricValue: (): number | null => null,
        getMetricMoE: null as ((geoid: string) => number | null) | null,
        allMetricValues2: [] as number[],
        getMetricValue2: null as ((geoid: string) => number | null) | null,
        getMetricMoE2: null as ((geoid: string) => number | null) | null,
      };

      if (!cachedMetric1 || !effectiveMetric) return noData;

      const lookup1 = new Map<string, number>();
      const lookupMoE1 = new Map<string, number>();
      const lookup2 = effectiveMetric2 && cachedMetric2 ? new Map<string, number>() : null;
      const lookupMoE2 = effectiveMetric2 && cachedMetric2 ? new Map<string, number>() : null;
      const values1: number[] = [];
      const values2: number[] = [];

      for (const [geoid, values] of Object.entries(cachedMetric1)) {
        const v1 = values.percentage != null ? Number(values.percentage) : null;
        if (v1 !== null && !isNaN(v1)) {
          lookup1.set(geoid, v1);
          values1.push(v1);
        }
        const moe1 = values.margin_of_error != null ? Number(values.margin_of_error) : null;
        if (moe1 !== null && !isNaN(moe1)) lookupMoE1.set(geoid, moe1);

        if (lookup2 && lookupMoE2 && cachedMetric2) {
          const v2 = cachedMetric2[geoid]?.percentage != null ? Number(cachedMetric2[geoid].percentage) : null;
          if (v2 !== null && !isNaN(v2)) {
            lookup2.set(geoid, v2);
            values2.push(v2);
          }
          const moe2 = cachedMetric2[geoid]?.margin_of_error != null ? Number(cachedMetric2[geoid].margin_of_error) : null;
          if (moe2 !== null && !isNaN(moe2)) lookupMoE2.set(geoid, moe2);
        }
      }

      return {
        allMetricValues: values1,
        getMetricValue: (geoid: string): number | null => lookup1.get(geoid) ?? null,
        getMetricMoE: (geoid: string): number | null => lookupMoE1.get(geoid) ?? null,
        allMetricValues2: values2,
        getMetricValue2: lookup2
          ? (geoid: string): number | null => lookup2.get(geoid) ?? null
          : null,
        getMetricMoE2: lookupMoE2
          ? (geoid: string): number | null => lookupMoE2.get(geoid) ?? null
          : null,
      };
    }, [cachedMetric1, cachedMetric2, effectiveMetric, effectiveMetric2]);

    const { allMetricValues, getMetricValue, getMetricMoE, allMetricValues2, getMetricValue2, getMetricMoE2 } = metricsDerived;

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

    const shouldRenderCensus =
      effectiveDataset &&
      effectiveMetric &&
      censusBlockGroups &&
      cachedMetric1 &&
      blockGroupData &&
      !shouldShowHawaiianHomelands;

    const shouldRenderHawaiianHomelands =
      effectiveDataset &&
      effectiveMetric &&
      shouldShowHawaiianHomelands &&
      hawaiianHomelands &&
      cachedMetric1;

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
            <MapResizeHandler
              onMapRef={(map) => {
                mapRef.current = map;
              }}
              onZoomChange={(z) => {
                setMapZoom(z);
              }}
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
                geographiesData={geographiesData}
                getMetricValue={getMetricValue}
                getMetricMoE={getMetricMoE ?? undefined}
                getMetricValue2={getMetricValue2 ?? undefined}
                getMetricMoE2={getMetricMoE2 ?? undefined}
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
                geographiesData={geographiesData}
                getMetricValue={getMetricValue}
                getMetricMoE={getMetricMoE ?? undefined}
                getMetricValue2={getMetricValue2 ?? undefined}
                getMetricMoE2={getMetricMoE2 ?? undefined}
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

          <LegendContainer>
            <RasterMapLegend mapId={mapId} />
            <MapLegend
              limits={colorScale?.limits ?? null}
              colors={colorScale?.getLegendColors() ?? null}
              bivariate={bivariateColorScale ?? undefined}
              metric1Label={effectiveMetric ?? undefined}
              metric2Label={effectiveMetric2 ?? undefined}
            />
          </LegendContainer>
        </div>

      </div>
    );
  },
);
