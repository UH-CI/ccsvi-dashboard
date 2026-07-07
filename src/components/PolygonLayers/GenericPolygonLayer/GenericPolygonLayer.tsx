import { GeoJSON, GeoJSONProps, useMap } from "react-leaflet";
import { Feature, FeatureCollection, Geometry, GeoJsonProperties } from "geojson";
import { Layer, LatLngBounds, LeafletMouseEvent, PathOptions } from "leaflet";
import React, { useEffect, useCallback, memo, useRef } from "react";

export interface StyleConfig {
  fillColor: string;
  weight: number;
  opacity: number;
  color: string;
  fillOpacity: number;
  dashArray?: string;
}

type PopupLayer<T extends GeoJsonProperties> = Layer & {
  bindPopup: (fn: () => string, opts: object) => void;
  closePopup: () => void;
  isPopupOpen?: () => boolean;
  setPopupContent?: (content: string) => void;
  feature?: Feature<Geometry, T>;
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
  renderPopup?: (feature: Feature<Geometry, T>) => string | null;
  /** Runs on popupopen when provided (e.g. async HCDP zonal stats). */
  enrichPopupOnOpen?: (
    feature: Feature<Geometry, T>,
    setContent: (html: string) => void,
  ) => Promise<void>;
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
    enrichPopupOnOpen,
    ...geoJsonProps
  }: GenericPolygonLayerProps<T>) => {
    const map = useMap();

    const storageKey = `${mapId}-${layerType}`;

    const layersRefInternal = useRef(new Map<string, Layer>());
    const layersRef = layersRefInternal.current;

    const prevActiveGeoidRef = useRef<string | null | undefined>(undefined);
    const popupEnrichTokenRef = useRef(0);

    const renderPopupRef = useRef(renderPopup);
    const onFeatureClickRef = useRef(onFeatureClick);
    const enrichPopupOnOpenRef = useRef(enrichPopupOnOpen);

    useEffect(() => {
      renderPopupRef.current = renderPopup;
      onFeatureClickRef.current = onFeatureClick;
      enrichPopupOnOpenRef.current = enrichPopupOnOpen;
    }, [renderPopup, onFeatureClick, enrichPopupOnOpen]);

    const runPopupEnrichment = useCallback(
      async (layer: PopupLayer<T>, feature: Feature<Geometry, T>) => {
        const enrich = enrichPopupOnOpenRef.current;
        if (!enrich) return;

        const base = renderPopupRef.current?.(feature);
        if (!base) {
          layer.closePopup();
          return;
        }

        const token = ++popupEnrichTokenRef.current;

        const setContent = (html: string) => {
          if (token !== popupEnrichTokenRef.current) return;
          if (!layer.isPopupOpen?.()) return;
          layer.setPopupContent?.(html);
        };

        try {
          await enrich(feature, setContent);
        } catch (err) {
          console.warn("Popup enrichment failed:", err);
        }
      },
      [],
    );

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
        layersRef.set(geoid, layer);

        const typedLayer = layer as PopupLayer<T>;
        typedLayer.feature = feature;

        if (onFeatureClick) {
          layer.on("click", (e: LeafletMouseEvent) => {
            onFeatureClickRef.current?.(feature, e);
          });
        }

        if ("bindPopup" in layer && renderPopupRef.current) {
          typedLayer.bindPopup(() => renderPopupRef.current?.(feature) ?? "", {
            minWidth: 250,
            maxWidth: 300,
          });

          layer.on("popupopen", () => {
            if (!renderPopupRef.current?.(feature)) {
              typedLayer.closePopup();
              return;
            }
            void runPopupEnrichment(typedLayer, feature);
          });
        }
      },
      [geoidProperty, onFeatureClick, layersRef, runPopupEnrichment],
    );

    useEffect(() => {
      const applyStyle = (layer: Layer, geoid: string, isActive: boolean) => {
        if (!("setStyle" in layer)) return;
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
      };

      const prevGeoid = prevActiveGeoidRef.current;
      const geoidChanged = prevGeoid !== activeFeatureGeoid;

      if (geoidChanged) {
        if (prevGeoid) {
          const prevLayer = layersRef.get(prevGeoid);
          if (prevLayer) applyStyle(prevLayer, prevGeoid, false);
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

      if ("openPopup" in layer) {
        map.once("moveend", () => {
          (layer as Layer & { openPopup: () => void }).openPopup();
        });
      }
      map.fitBounds(bounds, { padding: [20, 20] });
    }, [activeFeatureGeoid, layersRef, map]);

    useEffect(() => {
      if (!activeFeatureGeoid || !renderPopup) return;

      const layer = layersRef.get(activeFeatureGeoid) as PopupLayer<T> | undefined;
      if (!layer?.feature) return;

      if (!layer.isPopupOpen?.() || !layer.setPopupContent) return;

      const content = renderPopup(layer.feature);
      if (content) layer.setPopupContent(content);

      void runPopupEnrichment(layer, layer.feature);
    }, [renderPopup, enrichPopupOnOpen, activeFeatureGeoid, layersRef, runPopupEnrichment]);

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
      prevProps.enrichPopupOnOpen === nextProps.enrichPopupOnOpen
    );
  },
) as <T extends GeoJsonProperties = GeoJsonProperties>(
  props: GenericPolygonLayerProps<T>,
) => React.JSX.Element;
