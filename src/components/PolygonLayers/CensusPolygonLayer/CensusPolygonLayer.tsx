import React, { useCallback, useMemo } from "react";
import { Feature, FeatureCollection, Geometry } from "geojson";
import { BlockGroupProperties, GeographiesData } from "../../../types";
import { GenericPolygonLayer, StyleConfig } from "../GenericPolygonLayer/GenericPolygonLayer.tsx";
import { LeafletMouseEvent } from "leaflet";
import {
  buildPolygonPopupHtml,
  renderPolygonPopup,
  type PolygonPopupContext,
} from "../../../utils/renderPolygonPopup.ts";

const EMPTY_RASTER_LAYER_SET = new Set<string>();
import { meanHcdpForFeature } from "../../../utils/hcdpZonalStats.ts";
import { useHCDPStore, useHcdpOverlay } from "../../../stores/useHCDPStore.ts";
import { useRasterLayersStore } from "../../../stores/useRasterLayersStore.ts";
import { POLYGON_LAYERS } from "../../../config";

interface CensusPolygonLayerProps {
  data: FeatureCollection<Geometry, BlockGroupProperties> | null;
  geographiesData: GeographiesData | null;
  getMetricValue: (geoid: string) => number | null;
  getMetricMoE?: (geoid: string) => number | null;
  getMetricValue2?: (geoid: string) => number | null;
  getMetricMoE2?: (geoid: string) => number | null;
  mapId: string;
  // activeDataset: string;
  activeMetric: string;
  activeMetric2?: string | null;
  activeFeatureGeoid?: string | null;
  layerOpacity?: number;
  filterRange?: [number, number] | null;
  getColor: (value: number | null, value2?: number | null) => string;
  filteredGeoids?: Set<string> | null;
  onFeatureClick?: (feature: Feature<Geometry, BlockGroupProperties>, e: LeafletMouseEvent) => void;
}

const LAYER_CONFIG = POLYGON_LAYERS.censusBlockGroups;

export const CensusPolygonLayer: React.FC<CensusPolygonLayerProps> = ({
  data,
  geographiesData,
  getMetricValue,
  getMetricMoE,
  getMetricValue2,
  getMetricMoE2,
  mapId,
  // activeDataset,
  activeMetric,
  activeMetric2,
  activeFeatureGeoid,
  layerOpacity,
  filterRange,
  getColor,
  filteredGeoids,
  onFeatureClick,
}) => {
  const hcdpOverlay = useHcdpOverlay(mapId);
  const visibleRasterLayerIds = useRasterLayersStore(
    (s) => s.visibleLayerIdsByMap[mapId] ?? EMPTY_RASTER_LAYER_SET,
  );
  const rasterLayerConfigs = useRasterLayersStore((s) => s.rasterLayerConfigs);
  const hasActiveRasterLayer = (visibleRasterLayerIds?.size ?? 0) > 0;
  const hasSocialDataActive = Boolean(activeMetric?.trim()) || Boolean(activeMetric2?.trim());
  const shouldUseBackgroundStyle = Boolean(hcdpOverlay || hasActiveRasterLayer);
  const shouldShowPolygonPopup = Boolean(hcdpOverlay || hasSocialDataActive);
  const shouldConsumePolygonClicks = shouldShowPolygonPopup;

  const activeRasterLayerId = useMemo(() => {
    const ids = Array.from(visibleRasterLayerIds ?? []);
    return ids.find((id) => id.includes(".")) ?? ids[0] ?? null;
  }, [visibleRasterLayerIds]);

  const activeRasterLayerConfig = useMemo(() => {
    if (!activeRasterLayerId) return null;
    const [parentId, subId] = activeRasterLayerId.split(".");
    const parent = rasterLayerConfigs.find((layer) => layer.id === parentId);
    if (!parent) return null;
    return subId ? parent.subLayers?.find((layer) => layer.id === subId) ?? parent : parent;
  }, [activeRasterLayerId, rasterLayerConfigs]);

  const popupContext = useMemo<PolygonPopupContext>(
    () => ({
      config: {
        fields: LAYER_CONFIG.popup.fields,
        geoidProperty: LAYER_CONFIG.geoidProperty,
      },
      activeMetric,
      getMetricValue,
      geographiesData,
      activeMetric2,
      getMetricValue2,
      getMetricMoE,
      getMetricMoE2,
    }),
    [
      activeMetric,
      activeMetric2,
      getMetricValue,
      getMetricMoE,
      getMetricValue2,
      getMetricMoE2,
      geographiesData,
    ],
  );

  const isMatched = useCallback(
    (feature: Feature<Geometry, BlockGroupProperties>) => {
      if (filteredGeoids == null) return true;
      const geoid = String(feature.properties?.[LAYER_CONFIG.geoidProperty as keyof BlockGroupProperties] ?? "");
      return filteredGeoids.has(geoid);
    },
    [filteredGeoids],
  );

  const getStyle = useCallback(
    (feature: Feature<Geometry, BlockGroupProperties> | undefined): StyleConfig => {
      if (!feature) {
        console.log("Not feature")
        return LAYER_CONFIG.styles.default;
      }

      const geoid = feature.properties?.[LAYER_CONFIG.geoidProperty as keyof BlockGroupProperties];

      if (!geoid) {
        console.log("Not geoid")
        return LAYER_CONFIG.styles.default;
      }

      const geoidStr = String(geoid);
      const metricValue = getMetricValue(geoidStr);
      const metricValue2 = getMetricValue2?.(geoidStr) ?? undefined;

      const outOfRange =
        filterRange != null &&
        metricValue != null &&
        (metricValue < filterRange[0] || metricValue > filterRange[1]);

      const fillColor = outOfRange ? "#e0e0e0" : getColor(metricValue, metricValue2);

      if (filteredGeoids != null) {
        if (filteredGeoids.has(geoidStr)) {
          console.log("Is filtered")
          return { ...LAYER_CONFIG.styles.default, fillColor, ...LAYER_CONFIG.styles.filterMatch } as StyleConfig;
        }
        return { ...LAYER_CONFIG.styles.disabled } as StyleConfig;
      }

      if (shouldUseBackgroundStyle) {
        console.log("Switching to background style");
        return {
          ...LAYER_CONFIG.styles.background,
          fillColor,
        } as StyleConfig;
      }
      console.log("Default style");
      return {
        ...LAYER_CONFIG.styles.default,
        fillColor,
        color: outOfRange ? "#cccccc" : LAYER_CONFIG.styles.default.color,
      };
    },
    [getMetricValue, getMetricValue2, getColor, filteredGeoids, shouldUseBackgroundStyle, filterRange],
  );

  const getHighlightStyle = useCallback(
    (
      feature: Feature<Geometry, BlockGroupProperties>,
      baseStyle: StyleConfig | undefined,
    ): StyleConfig => {
      const base = {
        ...LAYER_CONFIG.styles.highlight,
        fillColor: baseStyle?.fillColor || LAYER_CONFIG.styles.default.fillColor,
      };
      if (filteredGeoids != null && isMatched(feature)) {
        return { ...base, color: LAYER_CONFIG.styles.filterMatch!.color as string };
      }
      return base as StyleConfig;
    },
    [filteredGeoids, isMatched],
  );

  const getLayerOpacity = useCallback((feature: Feature<Geometry, BlockGroupProperties> | undefined): StyleConfig => {
    if (shouldUseBackgroundStyle) {
      return LAYER_CONFIG.styles.background;
    }
    if (filteredGeoids != null) {
      return LAYER_CONFIG.styles.default;
    }
    return LAYER_CONFIG.styles.default;
  }, [shouldUseBackgroundStyle, filteredGeoids, layerOpacity]);

  const renderPopup = useMemo(
    () =>
      renderPolygonPopup(
        popupContext.config,
        popupContext.activeMetric,
        popupContext.getMetricValue,
        popupContext.geographiesData,
        popupContext.activeMetric2,
        popupContext.getMetricValue2,
        popupContext.getMetricMoE,
        popupContext.getMetricMoE2,
      ),
    [popupContext],
  );

  const enrichPopupOnOpen = useMemo(() => {
    if (!hcdpOverlay && !activeRasterLayerId) return undefined;

    return async (
      feature: Feature<Geometry, BlockGroupProperties>,
      setContent: (html: string) => void,
    ) => {
      if (hcdpOverlay) {
        const overlay = useHCDPStore.getState().overlaysByMap[mapId];
        if (!overlay?.arrayBuffer) return;

        const loadingHtml = buildPolygonPopupHtml(feature, popupContext, {
          label: overlay.title,
          loading: true,
        });
        if (loadingHtml) setContent(loadingHtml);

        const mean = await meanHcdpForFeature(overlay.arrayBuffer, overlay.loadId, feature);

        const currentOverlay = useHCDPStore.getState().overlaysByMap[mapId];
        if (!currentOverlay?.arrayBuffer) return;

        const enrichedHtml = buildPolygonPopupHtml(feature, popupContext, {
          label: currentOverlay.title,
          value: mean,
        });
        if (enrichedHtml) setContent(enrichedHtml);
        return;
      }

      if (!activeRasterLayerId) return;

      const overlayLabel = activeRasterLayerConfig?.name ?? "Raster layer";
      const overlaySuffix = activeRasterLayerConfig?.units ? ` ${activeRasterLayerConfig.units}` : "";
      const loadingHtml = buildPolygonPopupHtml(feature, popupContext, undefined, {
        label: overlayLabel,
        loading: true,
        suffix: overlaySuffix,
      });
      if (loadingHtml) setContent(loadingHtml);

      const currentVisibleIds = useRasterLayersStore.getState().visibleLayerIdsByMap[mapId];
      if (!currentVisibleIds?.has(activeRasterLayerId)) return;

      const samplePoint = (() => {
        const geometry = feature.geometry;
        if (!geometry) return null;

        const coords: Array<[number, number]> = [];
        const pushCoords = (value: unknown) => {
          if (Array.isArray(value) && value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number") {
            coords.push([value[0], value[1]] as [number, number]);
            return;
          }
          if (Array.isArray(value)) {
            value.forEach(pushCoords);
          }
        };

        if ("coordinates" in geometry) {
          pushCoords((geometry as { coordinates: unknown }).coordinates);
        } else if ("geometries" in geometry) {
          geometry.geometries.forEach((child) => {
            if ("coordinates" in child) {
              pushCoords((child as { coordinates: unknown }).coordinates);
            }
          });
        }

        if (coords.length === 0) return null;

        const total = coords.reduce(
          (acc, [lng, lat]) => ({ lng: acc.lng + lng, lat: acc.lat + lat }),
          { lng: 0, lat: 0 },
        );
        const count = coords.length;
        return { lng: total.lng / count, lat: total.lat / count };
      })();

      if (!samplePoint) return;

      try {
        const res = await fetch(
          `/api/tiles/cog/point/${samplePoint.lng},${samplePoint.lat}` +
            `?raster_id=${encodeURIComponent(activeRasterLayerId)}`,
        );
        if (!res.ok) return;
        const data = await res.json();
        const value: number | null = data.values?.[0] ?? null;

        const currentRasterId = useRasterLayersStore.getState().visibleLayerIdsByMap[mapId];
        if (!currentRasterId?.has(activeRasterLayerId)) return;

        const enrichedHtml = buildPolygonPopupHtml(feature, popupContext, undefined, {
          label: overlayLabel,
          value: Number.isFinite(value) ? value : null,
          suffix: overlaySuffix,
        });
        if (enrichedHtml) setContent(enrichedHtml);
      } catch {
        const fallbackHtml = buildPolygonPopupHtml(feature, popupContext, undefined, {
          label: overlayLabel,
          value: null,
          suffix: overlaySuffix,
        });
        if (fallbackHtml) setContent(fallbackHtml);
      }
    };
  }, [activeRasterLayerConfig, activeRasterLayerId, hcdpOverlay, mapId, popupContext]);

  const guardedOnFeatureClick = useCallback(
    (feature: Feature<Geometry, BlockGroupProperties>, e: LeafletMouseEvent) => {
      if (!isMatched(feature)) return;
      onFeatureClick?.(feature, e);
    },
    [isMatched, onFeatureClick],
  );

  const guardedRenderPopup = useMemo(
    () =>
      (feature: Feature<Geometry, BlockGroupProperties>) =>
        isMatched(feature) ? (renderPopup?.(feature) ?? null) : null,
    [isMatched, renderPopup],
  );

  return (
    <GenericPolygonLayer
      data={data}
      mapId={mapId}
      layerType="census"
      geoidProperty={LAYER_CONFIG.geoidProperty}
      layerOpacity={filteredGeoids != null || shouldUseBackgroundStyle ? undefined : layerOpacity}
      getStyle={getStyle}
      getHighlightStyle={getHighlightStyle}
      activeFeatureGeoid={activeFeatureGeoid}
      onFeatureClick={guardedOnFeatureClick}
      renderPopup={shouldShowPolygonPopup ? guardedRenderPopup : undefined}
      enrichPopupOnOpen={shouldShowPolygonPopup ? enrichPopupOnOpen : undefined}
      stopClickPropagation={shouldConsumePolygonClicks}
    />
  );
};
