import React, { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { leafletLayer, PolygonSymbolizer, LineSymbolizer } from "protomaps-leaflet";
import { useHazardLayersStore } from "../../stores";
import { dataUrl } from "../../api/client";
import { FeaturePopup } from "../FeaturePopup";
import type { SubHazardLayerConfig } from "../../types";

interface HazardLayerRendererProps {
  parentId: string;
  layerId?: string;
  mapId: string;
}

export const HazardLayerRenderer: React.FC<HazardLayerRendererProps> = ({
  parentId,
  layerId,
  mapId,
}) => {
  const map = useMap();

  const hazardLayers = useHazardLayersStore((state) => state.hazardLayerConfigs);
  const parentLayer = hazardLayers.find((h) => h.id === parentId);
  const subLayer =
    layerId && parentLayer?.subLayers
      ? parentLayer.subLayers.find((sub) => sub.id === layerId)
      : undefined;

  const activeLayer = subLayer ?? parentLayer;
  const activeLayerId = layerId ? `${parentId}.${layerId}` : parentId;

  const isVisible = useHazardLayersStore((state) => {
    const mapLayers = state.visibleLayerIdsByMap[mapId];
    return mapLayers ? mapLayers.has(activeLayerId) : false;
  });

  const file = activeLayer?.file;
  const popup = activeLayer?.popup;
  const color = activeLayer?.color || "#cc0000";
  const layerName = subLayer ? `${parentLayer?.name} – ${subLayer.name}` : parentLayer?.name;

  useEffect(() => {
    if (!map) return;

    let proLayer: ReturnType<typeof leafletLayer> | null = null;
    let domClickHandler: ((e: MouseEvent) => void) | null = null;
    let currentPopup: L.Popup | null = null;
    let isMounted = true;

    const clearLayer = () => {
      if (domClickHandler) {
        map.getContainer().removeEventListener("click", domClickHandler, true);
        domClickHandler = null;
      }
      if (currentPopup) {
        currentPopup.close();
        currentPopup = null;
      }
      if (proLayer) {
        proLayer.remove();
        proLayer = null;
      }
    };

    if (!isVisible || !file) {
      return clearLayer;
    }

    const url = dataUrl(`hazards/${file}.pmtiles`);

    if (!map.getPane("hazardPane")) {
      const pane = map.createPane("hazardPane");
      pane.style.zIndex = "450";
    }

    proLayer = leafletLayer({
      sources: { [file]: { url, maxDataZoom: 14 } },
      pane: "hazardPane",
      maxZoom: 18,
      paintRules: [
        {
          dataSource: file,
          dataLayer: file,
          symbolizer: new PolygonSymbolizer({
            fill: color,
            opacity: 0.3,
            stroke: color,
            width: 2,
          }),
        },
        {
          dataSource: file,
          dataLayer: file,
          symbolizer: new LineSymbolizer({ color, width: 2, opacity: 0.9 }),
        },
      ],
      labelRules: [],
    });

    if (!isMounted) return clearLayer;

    proLayer.addTo(map);

    domClickHandler = (e: MouseEvent) => {
      if (!proLayer) return;
      // Points are drawn above hazards, so a click on a point or cluster icon is theirs
      if ((e.target as HTMLElement).closest(".leaflet-marker-icon")) return;
      const latlng = map.mouseEventToLatLng(e);
      const results = proLayer.queryTileFeaturesDebug(latlng.lng, latlng.lat, 5);
      const features = results.get(file) ?? [];
      if (features.length === 0) return;
      e.stopImmediatePropagation();
      const content = popupHtml(features[0].feature.props, popup, layerName);
      currentPopup = L.popup().setLatLng(latlng).setContent(content).openOn(map);
    };
    map.getContainer().addEventListener("click", domClickHandler, true);

    return () => {
      isMounted = false;
      clearLayer();
    };
  }, [map, file, isVisible, popup, color, layerName]);

  return null;
};

// Heading: the title column's value, else the layer name. Then the hand-labelled fields, then every
// other column with a value under its raw name
const popupHtml = (
  props: Record<string, unknown>,
  popup: SubHazardLayerConfig["popup"],
  layerName: string | undefined,
) => {
  const title = popup?.title ? props[popup.title] : undefined;
  const listed = popup?.fields ?? [];
  const rest = Object.keys(props)
    .filter((key) => props[key] != null && key !== popup?.title)
    .filter((key) => !listed.some((field) => field.key === key))
    .map((key) => ({ key, label: key }));
  return FeaturePopup({
    metadata: [String(title || layerName)],
    properties: props,
    fields: [...listed, ...rest],
  });
};
