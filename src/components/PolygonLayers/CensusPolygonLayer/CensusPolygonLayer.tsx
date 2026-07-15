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
import { meanHcdpForFeature } from "../../../utils/hcdpZonalStats.ts";
import { useHCDPStore, useHcdpOverlay } from "../../../stores/useHCDPStore.ts";
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

      if (hcdpOverlay) {
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
    [getMetricValue, getMetricValue2, getColor, filteredGeoids, hcdpOverlay, filterRange],
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
    if (hcdpOverlay) {
      return LAYER_CONFIG.styles.background;
    }
    if (filteredGeoids != null) {
      return LAYER_CONFIG.styles.default;
    }
    return LAYER_CONFIG.styles.default;
  }, [hcdpOverlay, filteredGeoids, layerOpacity]);

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
    if (!hcdpOverlay) return undefined;

    return async (
      feature: Feature<Geometry, BlockGroupProperties>,
      setContent: (html: string) => void,
    ) => {
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
    };
  }, [hcdpOverlay, mapId, popupContext]);

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
      layerOpacity={filteredGeoids != null || hcdpOverlay ? undefined : layerOpacity}
      getStyle={getStyle}
      getHighlightStyle={getHighlightStyle}
      activeFeatureGeoid={activeFeatureGeoid}
      onFeatureClick={guardedOnFeatureClick}
      renderPopup={guardedRenderPopup}
      enrichPopupOnOpen={enrichPopupOnOpen}
    />
  );
};
