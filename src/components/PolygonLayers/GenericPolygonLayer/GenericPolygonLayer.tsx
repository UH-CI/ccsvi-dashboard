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
    getStyle,
    getHighlightStyle,
    onFeatureClick,
    renderPopup,
    ...geoJsonProps
  }: GenericPolygonLayerProps<T>) => {
    const map = useMap();
    const lastFitBoundsGeoid = useRef<string | null>(null);

    // Create unique storage key combining mapId and layerType
    const storageKey = `${mapId}-${layerType}`;

    // Initialize layer storage for this map-layer combination
    if (!globalLayersRef.has(storageKey)) {
      globalLayersRef.set(storageKey, new Map());
    }
    const layersRef = globalLayersRef.get(storageKey)!;

    const styleCallback = useCallback(
      (feature?: Feature<Geometry, T>): PathOptions => {
        if (!feature) {
          return {
            fillColor: "#cccccc",
            weight: 0.5,
            opacity: 1,
            color: "#333",
            fillOpacity: 0.3,
          };
        }

        return getStyle(feature);
      },
      [getStyle],
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

        if ("bindPopup" in layer && renderPopup) {
          const popupContent = renderPopup(feature);

          if (popupContent) {
            layer.bindPopup(popupContent, {
              minWidth: 250,
              maxWidth: 300,
            });
          }
        }
      },
      [geoidProperty, onFeatureClick, renderPopup, layersRef],
    );

    // Handle dynamic highlighting when activeFeatureGeoid OR style functions change
    // This is the key fix - include getStyle in dependencies so it re-runs when styles change
    useEffect(() => {
      layersRef.forEach((layer, geoid) => {
        if (!("setStyle" in layer)) return;

        const isActive = activeFeatureGeoid === geoid;

        const layerWithFeature = layer as Layer & { feature?: Feature<Geometry, T> };
        const feature = layerWithFeature.feature;

        if (!feature) return;

        // Use the current getStyle function directly (not a ref)
        const baseStyle = getStyle(feature);

        const highlightStyle =
          isActive && getHighlightStyle ? getHighlightStyle(feature, baseStyle) : baseStyle;

        (layer as { setStyle: (style: PathOptions) => void }).setStyle(highlightStyle);

        // Fit map to active feature bounds (e.g. when restoring from URL)
        if (isActive && geoid !== lastFitBoundsGeoid.current && "getBounds" in layer) {
          lastFitBoundsGeoid.current = geoid;
          const bounds = (layer as Layer & { getBounds: () => LatLngBounds }).getBounds();
          if (bounds.isValid()) {
            map.fitBounds(bounds, { padding: [20, 20] });
            // Open popup after fitBounds animation completes
            if ("openPopup" in layer) {
              map.once("moveend", () => {
                (layer as Layer & { openPopup: () => void }).openPopup();
              });
            }
          }
        }
      });

      if (!activeFeatureGeoid) {
        lastFitBoundsGeoid.current = null;
      }
    }, [activeFeatureGeoid, layersRef, storageKey, getStyle, getHighlightStyle, map]);

    // Update popup content when renderPopup changes (e.g. metric change)
    useEffect(() => {
      if (!renderPopup) return;

      layersRef.forEach((layer) => {
        if (!("setPopupContent" in layer)) return;

        const layerWithFeature = layer as Layer & { feature?: Feature<Geometry, T> };
        const feature = layerWithFeature.feature;
        if (!feature) return;

        const popupContent = renderPopup(feature);
        if (popupContent) {
          (layer as Layer & { setPopupContent: (content: string) => void }).setPopupContent(
            popupContent,
          );
        }
      });
    }, [renderPopup, layersRef]);

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
      prevProps.getStyle === nextProps.getStyle &&
      prevProps.getHighlightStyle === nextProps.getHighlightStyle &&
      prevProps.onFeatureClick === nextProps.onFeatureClick &&
      prevProps.renderPopup === nextProps.renderPopup
    );
  },
) as <T extends GeoJsonProperties = GeoJsonProperties>(
  props: GenericPolygonLayerProps<T>,
) => React.JSX.Element;
