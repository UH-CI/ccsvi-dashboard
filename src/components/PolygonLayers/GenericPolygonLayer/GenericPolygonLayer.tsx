import { GeoJSON, GeoJSONProps, Popup, useMap } from "react-leaflet";
import { Feature, FeatureCollection, Geometry, GeoJsonProperties } from "geojson";
import { LatLng, Layer, LatLngBounds, LeafletMouseEvent, PathOptions } from "leaflet";
import React, { useEffect, useCallback, memo, useRef, useState, type ReactNode } from "react";
import { NO_VALUE_COLOR } from "../../../config";

export interface StyleConfig {
  fillColor: string;
  weight: number;
  opacity: number;
  color: string;
  fillOpacity: number;
  dashArray?: string;
}

// A drawn shape, with the feature it was drawn from
type ShapeLayer<T extends GeoJsonProperties> = Layer & {
  feature?: Feature<Geometry, T>;
  getCenter: () => LatLng;
};

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
  // The shape's popup, or null for a shape that has none
  renderPopup?: (feature: Feature<Geometry, T>) => ReactNode | null;
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

    const storageKey = `${mapId}-${layerType}`;

    const layersRefInternal = useRef(new Map<string, Layer>());
    const layersRef = layersRefInternal.current;

    const prevActiveGeoidRef = useRef<string | null | undefined>(undefined);

    const renderPopupRef = useRef(renderPopup);
    const onFeatureClickRef = useRef(onFeatureClick);

    useEffect(() => {
      renderPopupRef.current = renderPopup;
      onFeatureClickRef.current = onFeatureClick;
    }, [renderPopup, onFeatureClick]);

    // The shape whose popup is open, and where: kept in state so the popup's position stays the same object
    const [popup, setPopup] = useState<{ geoid: string; position: LatLng } | null>(null);

    // Opens a shape's popup at its centre, if it has one; nothing changes when it's already open
    const openPopupFor = useCallback(
      (geoid: string) => {
        const layer = layersRef.get(geoid) as ShapeLayer<T> | undefined;
        if (!layer?.feature || !renderPopupRef.current?.(layer.feature)) return;
        setPopup((prev) => (prev?.geoid === geoid ? prev : { geoid, position: layer.getCenter() }));
      },
      [layersRef],
    );

    const styleCallback = useCallback(
      (feature?: Feature<Geometry, T>): PathOptions => {
        const baseStyle = feature
          ? getStyle(feature)
          : {
              fillColor: NO_VALUE_COLOR,
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
        layersRef.set(geoid, layer);

        (layer as ShapeLayer<T>).feature = feature;

        layer.on("click", (e: LeafletMouseEvent) => {
          openPopupFor(geoid);
          onFeatureClickRef.current?.(feature, e);
        });
      },
      [geoidProperty, layersRef, openPopupFor],
    );

    useEffect(() => {
      const applyStyle = (layer: Layer, geoid: string, isActive: boolean) => {
        if (!("setStyle" in layer)) return;
        const feature = (layer as Layer & { feature?: Feature<Geometry, T> }).feature;
        if (!feature) return;

        const baseStyle = getStyle(feature);
        let style =
          isActive && getHighlightStyle ? getHighlightStyle(feature, baseStyle) : baseStyle;

        if (layerOpacity !== undefined && !isActive) {
          style = { ...style, opacity: layerOpacity, fillOpacity: layerOpacity };
        }
        (layer as { setStyle: (style: PathOptions) => void }).setStyle(style);
      };

      const prevGeoid = prevActiveGeoidRef.current;
      const geoidChanged = prevGeoid !== activeFeatureGeoid;

      if (geoidChanged) {
        if (prevGeoid) {
          const prevLayer = layersRef.get(prevGeoid);
          if (prevLayer) applyStyle(prevLayer, prevGeoid, false);
          // Clearing the selection closes its popup
          if (!activeFeatureGeoid) setPopup((prev) => (prev?.geoid === prevGeoid ? null : prev));
        }

        if (activeFeatureGeoid) {
          const nextLayer = layersRef.get(activeFeatureGeoid);
          if (nextLayer) applyStyle(nextLayer, activeFeatureGeoid, true);
        }

        prevActiveGeoidRef.current = activeFeatureGeoid;
      } else {
        layersRef.forEach((layer, geoid) => {
          applyStyle(layer, geoid, geoid === activeFeatureGeoid);
        });
      }
    }, [activeFeatureGeoid, layersRef, getStyle, getHighlightStyle, layerOpacity]);

    useEffect(() => {
      if (!activeFeatureGeoid) return;

      const layer = layersRef.get(activeFeatureGeoid);
      if (!layer || !("getBounds" in layer)) return;

      const bounds = (layer as Layer & { getBounds: () => LatLngBounds }).getBounds();
      if (!bounds.isValid()) return;

      // A shape selected from the table or a link opens its popup once the map has moved to it
      map.once("moveend", () => openPopupFor(activeFeatureGeoid));
      map.fitBounds(bounds, { padding: [20, 20] });
    }, [activeFeatureGeoid, layersRef, map, openPopupFor]);

    if (!data) {
      return null;
    }

    const featureCollection: FeatureCollection<Geometry, T> = Array.isArray(data)
      ? {
          type: "FeatureCollection",
          features: data,
        }
      : data;

    const popupFeature = popup
      ? (layersRef.get(popup.geoid) as ShapeLayer<T> | undefined)?.feature
      : undefined;
    const popupContent = popupFeature && renderPopup ? renderPopup(popupFeature) : null;

    return (
      <>
        <GeoJSON
          key={storageKey}
          data={featureCollection}
          style={styleCallback}
          onEachFeature={onEachFeature}
          {...geoJsonProps}
        />
        {popup && popupContent && (
          // Closing clears only this shape's popup: moving to another shape removes this one after
          // the state already names the new shape
          <Popup
            key={popup.geoid}
            position={popup.position}
            minWidth={250}
            maxWidth={300}
            eventHandlers={{
              remove: () => setPopup((prev) => (prev?.geoid === popup.geoid ? null : prev)),
            }}
          >
            {popupContent}
          </Popup>
        )}
      </>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.data === nextProps.data &&
      prevProps.activeFeatureGeoid === nextProps.activeFeatureGeoid &&
      prevProps.geoidProperty === nextProps.geoidProperty &&
      prevProps.mapId === nextProps.mapId &&
      prevProps.layerType === nextProps.layerType &&
      prevProps.layerOpacity === nextProps.layerOpacity &&
      prevProps.getStyle === nextProps.getStyle &&
      prevProps.getHighlightStyle === nextProps.getHighlightStyle &&
      prevProps.onFeatureClick === nextProps.onFeatureClick &&
      prevProps.renderPopup === nextProps.renderPopup
    );
  },
) as <T extends GeoJsonProperties = GeoJsonProperties>(
  props: GenericPolygonLayerProps<T>,
) => React.JSX.Element;
