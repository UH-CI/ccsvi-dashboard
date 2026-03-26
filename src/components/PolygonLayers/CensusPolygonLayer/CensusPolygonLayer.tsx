import React, { useCallback, useMemo } from "react";
import { Feature, FeatureCollection, Geometry } from "geojson";
import { BlockGroupProperties, MetricsData } from "../../../types";
import { GenericPolygonLayer, StyleConfig } from "../GenericPolygonLayer/GenericPolygonLayer.tsx";
import { LeafletMouseEvent } from "leaflet";
import { renderPolygonPopup } from "../../../utils/renderPolygonPopup.ts";
import { POLYGON_LAYERS } from "../../../config";

interface CensusPolygonLayerProps {
  data: FeatureCollection<Geometry, BlockGroupProperties> | null;
  metricsData: MetricsData | null;
  getMetricValue: (geoid: string) => number | null;
  getMetricValue2?: (geoid: string) => number | null;
  mapId: string;
  // activeDataset: string;
  activeMetric: string;
  activeMetric2?: string | null;
  activeFeatureGeoid?: string | null;
  layerOpacity?: number;
  getColor: (value: number | null, value2?: number | null) => string;
  onFeatureClick?: (feature: Feature<Geometry, BlockGroupProperties>, e: LeafletMouseEvent) => void;
}

const LAYER_CONFIG = POLYGON_LAYERS.censusBlockGroups;

export const CensusPolygonLayer: React.FC<CensusPolygonLayerProps> = ({
  data,
  metricsData,
  getMetricValue,
  getMetricValue2,
  mapId,
  // activeDataset,
  activeMetric,
  activeMetric2,
  activeFeatureGeoid,
  layerOpacity,
  getColor,
  onFeatureClick,
}) => {
  const getStyle = useCallback(
    (feature: Feature<Geometry, BlockGroupProperties> | undefined): StyleConfig => {
      if (!feature) {
        return LAYER_CONFIG.styles.default;
      }

      const geoid = feature.properties?.[LAYER_CONFIG.geoidProperty as keyof BlockGroupProperties];

      if (!geoid) {
        return LAYER_CONFIG.styles.default;
      }

      const geoidStr = String(geoid);
      const metricValue = getMetricValue(geoidStr);
      const metricValue2 = getMetricValue2?.(geoidStr) ?? undefined;
      const fillColor = getColor(metricValue, metricValue2);

      return {
        ...LAYER_CONFIG.styles.default,
        fillColor,
      };
    },
    [getMetricValue, getMetricValue2, getColor],
  );

  const getHighlightStyle = useCallback(
    (
      feature: Feature<Geometry, BlockGroupProperties>,
      baseStyle: StyleConfig | undefined,
    ): StyleConfig => {
      return {
        ...LAYER_CONFIG.styles.highlight,
        fillColor: baseStyle?.fillColor || LAYER_CONFIG.styles.default.fillColor,
      };
    },
    [],
  );

  const renderPopup = useMemo(
    () =>
      renderPolygonPopup(
        {
          fields: LAYER_CONFIG.popup.fields,
          geoidProperty: LAYER_CONFIG.geoidProperty,
        },
        activeMetric,
        getMetricValue,
        metricsData,
        activeMetric2,
        getMetricValue2,
      ),
    [activeMetric, activeMetric2, getMetricValue, getMetricValue2, metricsData],
  );

  return (
    <GenericPolygonLayer
      data={data}
      mapId={mapId}
      layerType="census"
      geoidProperty={LAYER_CONFIG.geoidProperty}
      layerOpacity={layerOpacity}
      getStyle={getStyle}
      getHighlightStyle={getHighlightStyle}
      activeFeatureGeoid={activeFeatureGeoid}
      onFeatureClick={onFeatureClick}
      renderPopup={renderPopup}
    />
  );
};
