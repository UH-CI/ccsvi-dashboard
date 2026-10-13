import React, { useCallback, useMemo } from "react";
import { Feature, FeatureCollection, Geometry } from "geojson";
import { HawaiianHomelandProperties, GeographiesData } from "../../../types";
import { GenericPolygonLayer, StyleConfig } from "../GenericPolygonLayer/GenericPolygonLayer.tsx";
import { LeafletMouseEvent } from "leaflet";
import {
  buildPolygonPopupHtml,
  renderPolygonPopup,
  type PolygonPopupContext,
} from "../../../utils/renderPolygonPopup.ts";
import type { MetricLookup } from "../../SingleMapView/hooks/useMetricLookups";
import type { OverlayPopupField, PointCountsPopupField } from "../../FeaturePopup";
import { POLYGON_LAYERS } from "../../../config";
import { POINT_LAYERS } from "../../../config/pointLayers";
import { fetchPointCounts } from "../../../hooks/usePointCounts";
import { usePointLayerStore } from "../../../stores/usePointLayersStore.ts";
import { useRasterLayersStore } from "../../../stores/useRasterLayersStore.ts";
import { getActiveRaster, savedRasterAverage } from "../../../utils/savedRaster.ts";
import { pointLayerIconHtml } from "../../../utils/pointLayerIcon.tsx";

interface HawaiianHomelandsPolygonLayerProps {
  data: FeatureCollection<Geometry, HawaiianHomelandProperties> | null;
  geographiesData: GeographiesData | null;
  metric1: MetricLookup;
  metric2?: MetricLookup | null;
  mapId: string;
  activeMetric: string;
  activeMetric2?: string | null;
  activeFeatureGeoid?: string | null;
  layerOpacity?: number;
  getColor: (value: number | null, value2?: number | null) => string;
  filteredGeoids?: Set<string> | null;
  onFeatureClick?: (
    feature: Feature<Geometry, HawaiianHomelandProperties>,
    e: LeafletMouseEvent,
  ) => void;
}

const LAYER_CONFIG = POLYGON_LAYERS.hawaiianHomelands;

export const HawaiianHomelandsPolygonLayer: React.FC<HawaiianHomelandsPolygonLayerProps> = ({
  data,
  geographiesData,
  metric1,
  metric2,
  mapId,
  activeMetric,
  activeMetric2,
  activeFeatureGeoid,
  layerOpacity,
  getColor,
  filteredGeoids,
  onFeatureClick,
}) => {
  const visibleRasterLayerIds = useRasterLayersStore((s) => s.visibleLayerIdsByMap[mapId]);
  const rasterLayerConfigs = useRasterLayersStore((s) => s.rasterLayerConfigs);
  const activeRaster = useMemo(
    () => getActiveRaster(visibleRasterLayerIds, rasterLayerConfigs),
    [visibleRasterLayerIds, rasterLayerConfigs],
  );

  const getStyle = useCallback(
    (feature: Feature<Geometry, HawaiianHomelandProperties> | undefined): StyleConfig => {
      if (!feature) {
        return LAYER_CONFIG.styles.default;
      }

      const geoid =
        feature.properties?.[LAYER_CONFIG.geoidProperty as keyof HawaiianHomelandProperties];

      if (!geoid) {
        return LAYER_CONFIG.styles.default;
      }

      const geoidStr = String(geoid);
      const metricValue = metric1.getData(geoidStr).value;
      const metricValue2 = metric2?.getData(geoidStr).value ?? undefined;
      const fillColor = getColor(metricValue, metricValue2);

      if (filteredGeoids != null) {
        if (filteredGeoids.has(geoidStr)) {
          return {
            ...LAYER_CONFIG.styles.default,
            fillColor,
            ...LAYER_CONFIG.styles.filterMatch,
          } as StyleConfig;
        }
        return { ...LAYER_CONFIG.styles.disabled } as StyleConfig;
      }

      return {
        ...LAYER_CONFIG.styles.default,
        fillColor,
      };
    },
    [metric1, metric2, getColor, filteredGeoids],
  );

  const getHighlightStyle = useCallback(
    (
      feature: Feature<Geometry, HawaiianHomelandProperties>,
      baseStyle: StyleConfig | undefined,
    ): StyleConfig => {
      const base = {
        ...LAYER_CONFIG.styles.highlight,
        fillColor: baseStyle?.fillColor || LAYER_CONFIG.styles.default.fillColor,
      };
      const geoid = String(
        feature.properties?.[LAYER_CONFIG.geoidProperty as keyof HawaiianHomelandProperties] ?? "",
      );
      if (filteredGeoids?.has(geoid)) {
        return { ...base, color: LAYER_CONFIG.styles.filterMatch.color as string };
      }
      return base;
    },
    [filteredGeoids],
  );

  const handleFeatureClick = useCallback(
    (feature: Feature<Geometry, HawaiianHomelandProperties>, e: LeafletMouseEvent) => {
      if (onFeatureClick) {
        onFeatureClick(feature, e);
      }
    },
    [onFeatureClick],
  );

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

  const renderPopup = useMemo(() => renderPolygonPopup(popupContext), [popupContext]);

  // Point counts for the currently visible point layers and the visible raster's saved average
  // (snapshot at popup-open time)
  const enrichPopupOnOpen = useMemo(() => {
    return async (
      feature: Feature<Geometry, HawaiianHomelandProperties>,
      setContent: (html: string) => void,
    ) => {
      const geoid =
        feature.properties?.[LAYER_CONFIG.geoidProperty as keyof HawaiianHomelandProperties];
      if (!geoid) return;

      let pointCountsField: PointCountsPopupField = { loading: true, items: [] };
      let overlayField: OverlayPopupField | undefined;
      const render = () => {
        const html = buildPolygonPopupHtml(feature, popupContext, undefined, overlayField, pointCountsField);
        if (html) setContent(html);
      };
      render();

      const counts = await fetchPointCounts(String(geoid), true);
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

      if (activeRaster) {
        const label = activeRaster.config?.name ?? "Raster layer";
        const suffix = activeRaster.config?.units ? ` ${activeRaster.config.units}` : "";
        overlayField = { label, loading: true, suffix };
        render();

        let value: number | null = null;
        try {
          const savedMetric = activeRaster.config?.savedMetric as {
            dataset: string;
            metric: string;
          };
          value = await savedRasterAverage(savedMetric, String(geoid), true);
        } catch {
          value = null;
        }
        if (useRasterLayersStore.getState().visibleLayerIdsByMap[mapId]?.has(activeRaster.id)) {
          overlayField = { label, value, suffix };
          render();
        }
      }
    };
  }, [popupContext, mapId, activeRaster]);

  return (
    <GenericPolygonLayer
      data={data}
      mapId={mapId}
      layerType="hawaiian-homelands"
      geoidProperty={LAYER_CONFIG.geoidProperty}
      layerOpacity={layerOpacity}
      getStyle={getStyle}
      getHighlightStyle={getHighlightStyle}
      activeFeatureGeoid={activeFeatureGeoid}
      onFeatureClick={handleFeatureClick}
      renderPopup={renderPopup}
      enrichPopupOnOpen={enrichPopupOnOpen}
    />
  );
};
