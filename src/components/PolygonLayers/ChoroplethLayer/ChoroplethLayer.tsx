import React, { useCallback } from "react";
import type { Feature, FeatureCollection, Geometry, GeoJsonProperties } from "geojson";
import type { LeafletMouseEvent } from "leaflet";
import { GenericPolygonLayer, type StyleConfig } from "../GenericPolygonLayer/GenericPolygonLayer";
import { AreaPopupContent } from "../../FeaturePopup/AreaPopupContent";
import type { MetricLookup } from "../../SingleMapView/hooks/useMetricLookups";
import { useBoundary } from "../../../api/queries/boundaries";
import { useFilteredGeoids } from "../../../api/queries/filter";
import { useFilterStore } from "../../../stores/useFilterStore";
import { DEFAULT_LAYER_OPACITIES, useMapState, useMapStore } from "../../../stores/useMapStore";
import { useMapLayersStore } from "../../../stores/useMapLayersStore";
import { OUTSIDE_RANGE_FILL, OUTSIDE_RANGE_OUTLINE, POLYGON_LAYERS } from "../../../config";

type AreaFeature = Feature<Geometry, GeoJsonProperties>;

interface ChoroplethLayerProps {
  mapId: string;
  // Hawaiian Homelands areas, else block groups
  homelands: boolean;
  metric1: MetricLookup;
  metric2: MetricLookup | null;
  // The indicators' names, as the popup shows them
  label1: string;
  label2?: string;
  getColor: (value: number | null, value2?: number | null) => string;
}

// Block groups or Hawaiian Homelands coloured by the map's indicator; clicking one selects it and
// opens its popup. An area left out by the Filter can't be clicked.
export const ChoroplethLayer: React.FC<ChoroplethLayerProps> = ({
  mapId,
  homelands,
  metric1,
  metric2,
  label1,
  label2,
  getColor,
}) => {
  const config = POLYGON_LAYERS[homelands ? "hawaiianHomelands" : "censusBlockGroups"];
  const data = useBoundary(homelands ? "homelands" : "blockGroups") as
    | FeatureCollection<Geometry, GeoJsonProperties>
    | undefined;
  const filteredGeoids = useFilteredGeoids();
  const { primary: filterRange, comparison: filterRange2 } = useFilterStore(
    (state) => state.ranges,
  );
  const activeFeatureGeoid = useMapState(mapId)?.activeFeature?.geoid;
  const updateMapActiveFeature = useMapStore((state) => state.updateMapActiveFeature);
  const opacity = useMapStore(
    (state) =>
      (state.layerOpacities[mapId] ?? DEFAULT_LAYER_OPACITIES)[
        homelands ? "hawaiianHomelands" : "census"
      ],
  );
  const raster = useMapLayersStore((state) => state.rasters[mapId]);

  const geoidOf = useCallback(
    (feature: AreaFeature) => String(feature.properties?.[config.geoidProperty] ?? ""),
    [config],
  );

  const isMatched = useCallback(
    (feature: AreaFeature) => filteredGeoids == null || filteredGeoids.has(geoidOf(feature)),
    [filteredGeoids, geoidOf],
  );

  const getStyle = useCallback(
    (feature: AreaFeature | undefined): StyleConfig => {
      const geoid = feature ? geoidOf(feature) : "";
      if (!geoid) return config.styles.default as StyleConfig;

      const metricValue = metric1.getData(geoid).value;
      const metricValue2 = metric2?.getData(geoid).value ?? undefined;

      const outOfRange =
        (filterRange != null &&
          metricValue != null &&
          (metricValue < filterRange[0] || metricValue > filterRange[1])) ||
        (filterRange2 != null &&
          metricValue2 != null &&
          (metricValue2 < filterRange2[0] || metricValue2 > filterRange2[1]));

      const fillColor = outOfRange ? OUTSIDE_RANGE_FILL : getColor(metricValue, metricValue2);
      const noValue = metricValue === null || (metric2 !== null && metricValue2 == null);

      if (filteredGeoids != null) {
        if (filteredGeoids.has(geoid)) {
          return {
            ...config.styles.default,
            fillColor,
            ...config.styles.filterMatch,
          } as StyleConfig;
        }
        // Left out by the Filter; an area with no value keeps its hatch so it still reads as "no value"
        return { ...config.styles.disabled, ...(noValue && { fillColor }) } as StyleConfig;
      }

      // With a raster under it, the area is an outline so the raster shows through
      if (raster) return { ...config.styles.background, fillColor } as StyleConfig;

      return {
        ...config.styles.default,
        fillColor,
        color: outOfRange ? OUTSIDE_RANGE_OUTLINE : config.styles.default.color,
      } as StyleConfig;
    },
    [
      config,
      geoidOf,
      metric1,
      metric2,
      getColor,
      filteredGeoids,
      raster,
      filterRange,
      filterRange2,
    ],
  );

  const getHighlightStyle = useCallback(
    (feature: AreaFeature, baseStyle: StyleConfig | undefined): StyleConfig => {
      const base = {
        ...config.styles.highlight,
        fillColor: baseStyle?.fillColor || config.styles.default.fillColor,
      } as StyleConfig;
      if (filteredGeoids != null && isMatched(feature)) {
        return { ...base, color: config.styles.filterMatch.color as string };
      }
      return base;
    },
    [config, filteredGeoids, isMatched],
  );

  // Selects the clicked area, or clears the selection when it's the one already selected
  const handleClick = useCallback(
    (feature: AreaFeature, e: LeafletMouseEvent) => {
      if (!isMatched(feature)) return;
      e.target.bringToFront();
      const geoid = geoidOf(feature);
      updateMapActiveFeature(mapId, geoid === activeFeatureGeoid ? undefined : { geoid });
    },
    [isMatched, geoidOf, updateMapActiveFeature, mapId, activeFeatureGeoid],
  );

  // An area the Filter left out has no popup
  const renderPopup = useCallback(
    (feature: AreaFeature) =>
      isMatched(feature) ? (
        <AreaPopupContent
          feature={feature}
          mapId={mapId}
          homelands={homelands}
          fields={config.popup.fields}
          geoidProperty={config.geoidProperty}
          label1={label1}
          metric1={metric1}
          label2={label2}
          metric2={metric2}
        />
      ) : null,
    [isMatched, mapId, homelands, config, label1, metric1, label2, metric2],
  );

  return (
    <GenericPolygonLayer
      data={data ?? null}
      mapId={mapId}
      layerType={homelands ? "hawaiian-homelands" : "census"}
      geoidProperty={config.geoidProperty}
      // While filtered, or over a raster, the styles set their own opacity
      layerOpacity={filteredGeoids != null || raster ? undefined : opacity}
      getStyle={getStyle}
      getHighlightStyle={getHighlightStyle}
      activeFeatureGeoid={activeFeatureGeoid}
      onFeatureClick={handleClick}
      renderPopup={renderPopup}
    />
  );
};
