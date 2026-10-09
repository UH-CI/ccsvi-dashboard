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
import type { MetricLookup } from "../../SingleMapView/hooks/useMetricLookups";
import type { HcdpPopupField, OverlayPopupField, PointCountsPopupField } from "../../FeaturePopup";

const EMPTY_RASTER_LAYER_SET = new Set<string>();
import { meanHcdpForFeature, meanRasterForFeature } from "../../../utils/zonalStats.ts";
import { useHCDPStore, useHcdpOverlay } from "../../../stores/useHCDPStore.ts";
import { useRasterLayersStore } from "../../../stores/useRasterLayersStore.ts";
import { usePointLayerStore } from "../../../stores/usePointLayersStore.ts";
import { POLYGON_LAYERS } from "../../../config";
import { POINT_LAYERS } from "../../../config/pointLayers";
import { fetchPointCounts } from "../../../hooks/usePointCounts";
import { pointLayerIconHtml } from "../../../utils/pointLayerIcon.tsx";

interface CensusPolygonLayerProps {
  data: FeatureCollection<Geometry, BlockGroupProperties> | null;
  geographiesData: GeographiesData | null;
  metric1: MetricLookup;
  metric2?: MetricLookup | null;
  mapId: string;
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
  metric1,
  metric2,
  mapId,
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
      metric1,
      geographiesData,
      activeMetric2,
      metric2,
    }),
    [activeMetric, activeMetric2, metric1, metric2, geographiesData],
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
      const metricValue = metric1.getData(geoidStr).value;
      const metricValue2 = metric2?.getData(geoidStr).value ?? undefined;

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
    [metric1, metric2, getColor, filteredGeoids, shouldUseBackgroundStyle, filterRange],
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

  const renderPopup = useMemo(() => renderPolygonPopup(popupContext), [popupContext]);

  const enrichPopupOnOpen = useMemo(() => {
    return async (
      feature: Feature<Geometry, BlockGroupProperties>,
      setContent: (html: string) => void,
    ) => {
      // Tracks the latest known value of each optional field, so every redraw
      // includes all of them together
      let hcdpField: HcdpPopupField | undefined;
      let overlayField: OverlayPopupField | undefined;
      let pointCountsField: PointCountsPopupField | undefined;

      const render = () => {
        const html = buildPolygonPopupHtml(feature, popupContext, hcdpField, overlayField, pointCountsField);
        if (html) setContent(html);
      };

      // Point counts
      const geoid = feature.properties?.[LAYER_CONFIG.geoidProperty as keyof BlockGroupProperties];
      if (geoid) {
        pointCountsField = { loading: true, items: [] };
        render();

        const counts = await fetchPointCounts(String(geoid), false);
        const visibleIds = usePointLayerStore.getState().visibleLayerIdsByMap[mapId];
        const items = POINT_LAYERS.filter((layer) => visibleIds?.has(layer.id))
          .map((layer) => ({
            label: layer.name,
            value: counts[layer.id] ?? 0,
            iconHtml: pointLayerIconHtml(layer),
          }))
          .filter((item) => item.value > 0);
        pointCountsField = { loading: false, items };
        render();
      }

      if (hcdpOverlay) {
        const overlay = useHCDPStore.getState().overlaysByMap[mapId];
        if (overlay?.arrayBuffer) {
          hcdpField = { label: overlay.title, loading: true };
          render();

          const mean = await meanHcdpForFeature(overlay.arrayBuffer, overlay.loadId, feature);

          const currentOverlay = useHCDPStore.getState().overlaysByMap[mapId];
          if (currentOverlay?.arrayBuffer) {
            hcdpField = { label: currentOverlay.title, value: mean };
            render();
          }
        }
      } else if (activeRasterLayerId) {
        const overlayLabel = activeRasterLayerConfig?.name ?? "Raster layer";
        const overlaySuffix = activeRasterLayerConfig?.units ? ` ${activeRasterLayerConfig.units}` : "";
        overlayField = { label: overlayLabel, loading: true, suffix: overlaySuffix };
        render();

        const currentVisibleIds = useRasterLayersStore.getState().visibleLayerIdsByMap[mapId];
        if (currentVisibleIds?.has(activeRasterLayerId)) {
          try {
            const res = await fetch(`/api/tiles/cog/file?raster_id=${encodeURIComponent(activeRasterLayerId)}`);
            if (res.ok) {
              const arrayBuffer = await res.arrayBuffer();
              const value = await meanRasterForFeature(arrayBuffer, activeRasterLayerId, feature);

              const currentRasterId = useRasterLayersStore.getState().visibleLayerIdsByMap[mapId];
              if (currentRasterId?.has(activeRasterLayerId)) {
                overlayField = {
                  label: overlayLabel,
                  value: Number.isFinite(value ?? NaN) ? value : null,
                  suffix: overlaySuffix,
                };
                render();
              }
            }
          } catch {
            overlayField = { label: overlayLabel, value: null, suffix: overlaySuffix };
            render();
          }
        }
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
