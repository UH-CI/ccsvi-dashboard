import React, { useEffect } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useMap } from "react-leaflet";
import { useQuery } from "@tanstack/react-query";
import { leafletLayer, PolygonSymbolizer, LineSymbolizer } from "protomaps-leaflet";
import { hazardFileQuery } from "../../api/queries/hazardFile";
import { addClickTarget, CLICK_ORDER } from "../../utils/mapClicks";
import { ensurePane } from "../../utils/mapPanes";
import { dataUrl } from "../../api/client";
import { FeaturePopup } from "../FeaturePopup/FeaturePopup";
import type { SubHazardLayerConfig } from "../../types";

interface HazardLayerRendererProps {
  // The layer or sub-layer drawn; only ones with a file are
  layer: SubHazardLayerConfig;
  // As the popup and the "couldn't load" message show it: "<layer> – <sub-layer>" for a sub-layer
  name: string;
}

// One hazard layer or sub-layer, drawn while it's on
export const HazardLayerRenderer: React.FC<HazardLayerRendererProps> = ({ layer, name }) => {
  const map = useMap();
  const file = layer.file!;
  const { popup, color } = layer;

  useQuery(hazardFileQuery(file, name));

  // Draws the layer, and offers its popup for clicks on its shapes
  useEffect(() => {
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
      return features.length > 0 ? popupHtml(features[0].feature.props, popup, name) : null;
    });

    return () => {
      removeClick();
      proLayer.remove();
    };
  }, [map, file, popup, color, name]);

  return null;
};

// Heading: the title column's value, else the layer name. Then the hand-labelled fields, then every
// other column with a value under its raw name
const popupHtml = (
  props: Record<string, unknown>,
  popup: SubHazardLayerConfig["popup"],
  layerName: string,
) => {
  const title = popup?.title ? props[popup.title] : undefined;
  const listed = popup?.fields ?? [];
  const rest = Object.keys(props)
    .filter((key) => props[key] != null && key !== popup?.title)
    .filter((key) => !listed.some((field) => field.key === key))
    .map((key) => ({ key, label: key }));
  return renderToStaticMarkup(
    <FeaturePopup
      metadata={[String(title || layerName)]}
      properties={props}
      fields={[...listed, ...rest]}
    />,
  );
};
