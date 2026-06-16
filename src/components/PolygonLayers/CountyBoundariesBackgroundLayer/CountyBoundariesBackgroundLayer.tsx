import React, { useCallback } from "react";
import { Feature, FeatureCollection, Geometry } from "geojson";
import { GenericPolygonLayer, StyleConfig } from "../GenericPolygonLayer/GenericPolygonLayer.tsx";
import { POLYGON_LAYERS } from "../../../config";

interface CountyBoundariesBackgroundLayerProps {
  data: FeatureCollection<Geometry, { NAME20: string; POP20: number }> | null;
  mapId: string;
  layerOpacity?: number;
}

const LAYER_CONFIG = POLYGON_LAYERS.countyBoundaries;

export const CountyBoundariesBackgroundLayer: React.FC<CountyBoundariesBackgroundLayerProps> = ({
  data,
  mapId,
  layerOpacity,
}) => {
  const getStyle = useCallback(
    (feature: Feature<Geometry, { NAME20: string; POP20: number }> | undefined): StyleConfig => {
      return LAYER_CONFIG.styles.disabled;
    },
    [],
  );

  return (
    <GenericPolygonLayer
      data={data}
      mapId={mapId}
      layerType="county-boundaries-background"
      geoidProperty="NAME20"
      layerOpacity={layerOpacity}
      getStyle={getStyle}
    />
  );
};
