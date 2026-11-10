import React, { useEffect } from "react";
import { useMap } from "react-leaflet";
import { leafletLayer, PolygonSymbolizer, LineSymbolizer } from "protomaps-leaflet";
import { addClickTarget, CLICK_ORDER } from "../../utils/mapClicks";
import { ensurePane } from "../../utils/mapPanes";
import { useMapLayersStore } from "../../stores/useMapLayersStore";
import { HAZARD_LAYERS } from "../../config/hazardLayers";
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

  const parentLayer = HAZARD_LAYERS.find((h) => h.id === parentId);
  const subLayer =
    layerId && parentLayer?.subLayers
      ? parentLayer.subLayers.find((sub) => sub.id === layerId)
      : undefined;

  const activeLayer = subLayer ?? parentLayer;
  const activeLayerId = layerId ? `${parentId}.${layerId}` : parentId;

  const isVisible = useMapLayersStore((state) => state.hazards[mapId]?.has(activeLayerId) ?? false);

  const file = activeLayer?.file;
  const popup = activeLayer?.popup;
  const color = activeLayer?.color;
  const layerName = subLayer ? `${parentLayer?.name} – ${subLayer.name}` : parentLayer?.name;

  // Draws the layer while it's on, and offers its popup for clicks on its shapes
  useEffect(() => {
    if (!isVisible || !file) return;

    const url = dataUrl(`hazards/${file}.pmtiles`);

    const proLayer = leafletLayer({
      sources: { [file]: { url, maxDataZoom: 14 } },
      pane: ensurePane(map, "hazardPane"),
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

    proLayer.addTo(map);

    const removeClick = addClickTarget(map, CLICK_ORDER.hazard, (latlng) => {
      const features = proLayer.queryTileFeaturesDebug(latlng.lng, latlng.lat, 5).get(file) ?? [];
      return features.length > 0 ? popupHtml(features[0].feature.props, popup, layerName) : null;
    });

    return () => {
      removeClick();
      proLayer.remove();
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
