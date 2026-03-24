import { GeoJSON, GeoJSONProps, useMap } from "react-leaflet";
import { Feature, FeatureCollection, Geometry, GeoJsonProperties } from "geojson";
import { Layer, LatLngBounds, LeafletMouseEvent, PathOptions } from "leaflet";
import React, { useEffect, useCallback, memo, useRef } from "react";

// Global ref to store layers per map across component remounts
const globalLayersRef = new Map<string, Map<string, Layer>>();

export interface StyleConfig {
  fillColor: string;
  weight: number;
  opacity: number;
  color: string;
  fillOpacity: number;
  dashArray?: string;
}

export interface GenericPolygonLayerProps<
  T extends GeoJsonProperties = GeoJsonProperties,
> extends Omit<GeoJSONProps, "data" | "style" | "onEachFeature"> {
  data: Feature<Geometry, T>[] | FeatureCollection<Geometry, T> | null;
  mapId: string;
  layerType: string;
  geoidProperty: string;
  activeFeatureGeoid?: string | null;
  layerOpacity?: number;
  getStyle: (feature: Feature<Geometry, T> | undefined) => StyleConfig;
  getHighlightStyle?: (
    feature: Feature<Geometry, T>,
    baseStyle: StyleConfig | undefined,
  ) => StyleConfig;
  onFeatureClick?: (feature: Feature<Geometry, T>, e: LeafletMouseEvent) => void;
  renderPopup?: (feature: Feature<Geometry, T>) => string | null;
}

export const GenericPolygonLayer = memo(
  <T extends GeoJsonProperties = GeoJsonProperties>({
    data,
    mapId,
    layerType,
    geoidProperty,
    activeFeatureGeoid,
    layerOpacity,
    getStyle,
    getHighlightStyle,
    onFeatureClick,
    renderPopup,
    ...geoJsonProps
  }: GenericPolygonLayerProps<T>) => {
    const map = useMap();

    // Create unique storage key combining mapId and layerType
    const storageKey = `${mapId}-${layerType}`;

    // Initialize layer storage for this map-layer combination
    if (!globalLayersRef.has(storageKey)) {
      globalLayersRef.set(storageKey, new Map());
    }
    const layersRef = globalLayersRef.get(storageKey)!;

    // Latest renderPopup
    const renderPopupRef = useRef(renderPopup);
    useEffect(() => {
      renderPopupRef.current = renderPopup;
    }, [renderPopup]);

    const styleCallback = useCallback(
      (feature?: Feature<Geometry, T>): PathOptions => {
        const baseStyle = feature
          ? getStyle(feature)
          : {
              fillColor: "#cccccc",
              weight: 0.5,
              opacity: 1,
              color: "#333",
              fillOpacity: 0.3,
            };

        if (layerOpacity !== undefined) {
          return {
            ...baseStyle,
            opacity: layerOpacity,
            fillOpacity: layerOpacity,
          };
        }

        return baseStyle;
      },
      [getStyle, layerOpacity],
    );

    const onEachFeature = useCallback(
      (feature: Feature<Geometry, T>, layer: Layer): void => {
        if (!feature.properties) return;

        const geoid = String(feature.properties[geoidProperty] ?? "");

        // Store layer reference
        layersRef.set(geoid, layer);

        if (onFeatureClick) {
          layer.on("click", (e: LeafletMouseEvent) => {
            onFeatureClick(feature, e);
          });
        }

        if ("bindPopup" in layer && renderPopupRef.current) {
          layer.bindPopup(() => renderPopupRef.current?.(feature) ?? "", {
            minWidth: 250,
            maxWidth: 300,
          });
        }
      },
      [geoidProperty, onFeatureClick, layersRef],
    );

    // Apply highlight/normal styles
    useEffect(() => {
      layersRef.forEach((layer, geoid) => {
        if (!("setStyle" in layer)) return;

        const isActive = activeFeatureGeoid === geoid;

        const layerWithFeature = layer as Layer & { feature?: Feature<Geometry, T> };
        const feature = layerWithFeature.feature;
        if (!feature) return;

        const baseStyle = getStyle(feature);
        let style =
          isActive && getHighlightStyle ? getHighlightStyle(feature, baseStyle) : baseStyle;

        if (layerOpacity !== undefined && !isActive) {
          style = { ...style, opacity: layerOpacity, fillOpacity: layerOpacity };
        }

        (layer as { setStyle: (style: PathOptions) => void }).setStyle(style);
      });
    }, [activeFeatureGeoid, layersRef, getStyle, getHighlightStyle, layerOpacity]);

    // Center map and open popup when active feature changes
    useEffect(() => {
      if (!activeFeatureGeoid) return;

      const layer = layersRef.get(activeFeatureGeoid);
      if (!layer || !("getBounds" in layer)) return;

      const bounds = (layer as Layer & { getBounds: () => LatLngBounds }).getBounds();
      if (!bounds.isValid()) return;

      if ("openPopup" in layer) {
        map.once("moveend", () => {
          (layer as Layer & { openPopup: () => void }).openPopup();
        });
      }
      map.fitBounds(bounds, { padding: [20, 20] });
    }, [activeFeatureGeoid, layersRef, map]);

    // Update popup content when renderPopup changes (e.g. metric change)
    useEffect(() => {
      if (!activeFeatureGeoid || !renderPopup) return;

      const layer = layersRef.get(activeFeatureGeoid);
      if (!layer) return;

      const layerTyped = layer as Layer & {
        isPopupOpen?: () => boolean;
        setPopupContent?: (content: string) => void;
        feature?: Feature<Geometry, T>;
      };

      if (!layerTyped.isPopupOpen?.() || !layerTyped.setPopupContent || !layerTyped.feature) return;

      const content = renderPopup(layerTyped.feature);
      if (content) layerTyped.setPopupContent(content);
    }, [renderPopup, activeFeatureGeoid, layersRef]);

    if (!data) {
      return null;
    }

    const featureCollection: FeatureCollection<Geometry, T> = Array.isArray(data)
      ? {
          type: "FeatureCollection",
          features: data,
        }
      : data;

    return (
      <GeoJSON
        key={storageKey}
        data={featureCollection}
        style={styleCallback}
        onEachFeature={onEachFeature}
        eventHandlers={{
          click: (e) => {
            e.originalEvent.stopPropagation();
          },
        }}
        {...geoJsonProps}
      />
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison to prevent unnecessary re-renders
    return (
      prevProps.data === nextProps.data &&
      prevProps.activeFeatureGeoid === nextProps.activeFeatureGeoid &&
      prevProps.geoidProperty === nextProps.geoidProperty &&
      prevProps.mapId === nextProps.mapId &&
      prevProps.layerType === nextProps.layerType &&
      prevProps.layerOpacity === nextProps.layerOpacity &&
      prevProps.getStyle === nextProps.getStyle &&
      prevProps.getHighlightStyle === nextProps.getHighlightStyle &&
      prevProps.onFeatureClick === nextProps.onFeatureClick
    );
  },
) as <T extends GeoJsonProperties = GeoJsonProperties>(
  props: GenericPolygonLayerProps<T>,
) => React.JSX.Element;
