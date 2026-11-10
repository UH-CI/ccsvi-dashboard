import React, { useCallback, useMemo } from "react";
import type { Feature, FeatureCollection, Geometry, GeoJsonProperties } from "geojson";
import type { LeafletMouseEvent } from "leaflet";
import { useShallow } from "zustand/react/shallow";
import { GenericPolygonLayer, type StyleConfig } from "../GenericPolygonLayer/GenericPolygonLayer";
import {
  buildPolygonPopupHtml,
  renderPolygonPopup,
  type PolygonPopupContext,
} from "../../../utils/renderPolygonPopup";
import type { MetricLookup } from "../../SingleMapView/hooks/useMetricLookups";
import type { HcdpPopupField, OverlayPopupField, PointCountsPopupField } from "../../FeaturePopup";
import { getAreaStats } from "../../../api/client";
import { useBoundary } from "../../../api/queries/boundaries";
import { useFilteredGeoids } from "../../../api/queries/filter";
import { useGeographies } from "../../../api/queries/geographies";
import { fetchPointCounts } from "../../../api/queries/pointCounts";
import { savedRasterStats } from "../../../api/queries/savedRaster";
import { useAppStore } from "../../../stores/useAppStore";
import { DEFAULT_LAYER_OPACITIES, useMapConfig, useMapStore } from "../../../stores/useMapStore";
import { useMapLayersStore } from "../../../stores/useMapLayersStore";
import { OUTSIDE_RANGE_FILL, OUTSIDE_RANGE_OUTLINE, POLYGON_LAYERS } from "../../../config";
import { POINT_LAYERS } from "../../../config/pointLayers";
import { rasterConfig } from "../../../config/rasterLayers";
import { pointLayerIconHtml } from "../../../utils/pointLayerIcon";

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
  const geographiesData = useGeographies();
  const filteredGeoids = useFilteredGeoids();
  const { filterRange, filterRange2 } = useAppStore(
    useShallow((state) => ({ filterRange: state.filterRange, filterRange2: state.filterRange2 })),
  );
  const activeFeatureGeoid = useMapConfig(mapId)?.activeFeature?.geoid;
  const updateMapActiveFeature = useMapStore((state) => state.updateMapActiveFeature);
  const opacity = useMapStore(
    (state) =>
      (state.layerOpacities[mapId] ?? DEFAULT_LAYER_OPACITIES)[
        homelands ? "hawaiianHomelands" : "census"
      ],
  );
  const raster = useMapLayersStore((state) => state.rasters[mapId]);
  const savedRasterId = raster?.kind === "cog" ? raster.id : null;

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

      if (filteredGeoids != null) {
        if (filteredGeoids.has(geoid)) {
          return {
            ...config.styles.default,
            fillColor,
            ...config.styles.filterMatch,
          } as StyleConfig;
        }
        return { ...config.styles.disabled } as StyleConfig;
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

  const popupContext = useMemo<PolygonPopupContext>(
    () => ({
      config: { fields: config.popup.fields, geoidProperty: config.geoidProperty },
      activeMetric: label1,
      metric1,
      geographiesData,
      activeMetric2: label2,
      metric2,
    }),
    [config, label1, label2, metric1, metric2, geographiesData],
  );

  const renderPopup = useMemo(() => {
    const render = renderPolygonPopup(popupContext);
    return (feature: AreaFeature) => (isMatched(feature) ? render(feature) : null);
  }, [popupContext, isMatched]);

  // The popup's numbers that need a request: point counts, and the map's raster for this area
  const enrichPopupOnOpen = useMemo(() => {
    return async (feature: AreaFeature, setContent: (html: string) => void) => {
      const geoid = geoidOf(feature);
      if (!geoid) return;

      // Tracks the latest known value of each optional field, so every redraw
      // includes all of them together
      let hcdpField: HcdpPopupField | undefined;
      let overlayField: OverlayPopupField | undefined;
      let pointCountsField: PointCountsPopupField = { loading: true, items: [] };

      const render = () => {
        const html = buildPolygonPopupHtml(
          feature,
          popupContext,
          hcdpField,
          overlayField,
          pointCountsField,
        );
        if (html) setContent(html);
      };
      render();

      const counts = await fetchPointCounts(geoid, homelands);
      const visibleIds = useMapLayersStore.getState().points[mapId];
      const items = POINT_LAYERS.filter((layer) => visibleIds?.has(layer.id))
        .map((layer) => ({
          label: layer.name,
          value: counts[layer.id] ?? 0,
          iconHtml: pointLayerIconHtml(layer),
        }))
        .filter((item) => item.value > 0);
      pointCountsField = { loading: false, items };
      render();

      const currentRaster = () => useMapLayersStore.getState().rasters[mapId];

      if (raster?.kind === "hcdp") {
        const overlay = currentRaster();
        if (overlay?.kind !== "hcdp") return;
        hcdpField = { label: overlay.title, loading: true };
        render();

        const stats = await getAreaStats(overlay, feature).catch(() => ({ mean: null, max: null }));

        const currentOverlay = currentRaster();
        if (currentOverlay?.kind === "hcdp") {
          hcdpField = { label: currentOverlay.title, meanValue: stats.mean, maxValue: stats.max };
          render();
        }
      } else if (savedRasterId) {
        const savedStillShown = () => {
          const now = currentRaster();
          return now?.kind === "cog" && now.id === savedRasterId;
        };
        const { name, units } = rasterConfig(savedRasterId);
        const suffix = units ? ` ${units}` : "";
        overlayField = { label: name, loading: true, suffix };
        render();

        if (!savedStillShown()) return;
        try {
          const stats = await savedRasterStats(savedRasterId, geoid, homelands);
          if (savedStillShown()) {
            overlayField = { label: name, meanValue: stats.mean, maxValue: stats.max, suffix };
            render();
          }
        } catch {
          overlayField = { label: name, meanValue: null, maxValue: null, suffix };
          render();
        }
      }
    };
  }, [geoidOf, popupContext, homelands, mapId, raster, savedRasterId]);

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
      enrichPopupOnOpen={enrichPopupOnOpen}
    />
  );
};
