import React, { useCallback, useMemo } from "react";
import { Feature, FeatureCollection, Geometry } from "geojson";
import { HawaiianHomelandProperties, GeographiesData } from "../../../types";
import { GenericPolygonLayer, StyleConfig } from "../GenericPolygonLayer/GenericPolygonLayer.tsx";
import { LeafletMouseEvent } from "leaflet";
import { renderPolygonPopup } from "../../../utils/renderPolygonPopup.ts";
import type { MetricLookup } from "../../SingleMapView/hooks/useMetricLookups";
import { POLYGON_LAYERS } from "../../../config";

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
  onFeatureClick,
}) => {
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

      return {
        ...LAYER_CONFIG.styles.default,
        fillColor,
      };
    },
    [metric1, metric2, getColor],
  );

  const getHighlightStyle = useCallback(
    (
      feature: Feature<Geometry, HawaiianHomelandProperties>,
      baseStyle: StyleConfig | undefined,
    ): StyleConfig => {
      return {
        ...LAYER_CONFIG.styles.highlight,
        fillColor: baseStyle?.fillColor || LAYER_CONFIG.styles.default.fillColor,
      };
    },
    [],
  );

  const handleFeatureClick = useCallback(
    (feature: Feature<Geometry, HawaiianHomelandProperties>, e: LeafletMouseEvent) => {
      if (onFeatureClick) {
        onFeatureClick(feature, e);
      }
    },
    [onFeatureClick],
  );

  const renderPopup = useMemo(
    () =>
      renderPolygonPopup({
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
    />
  );
};
