import React, { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { leafletLayer, PolygonSymbolizer, LineSymbolizer } from "protomaps-leaflet";
import { useHazardLayersStore } from "../../stores";
import parseGeoraster from "georaster";
import GeoRasterLayer from "georaster-layer-for-leaflet";

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

  const filePath = activeLayer?.filePath;
  const popupConfig = activeLayer?.popupConfig;
  const color = activeLayer?.color || "#cc0000";

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

    if (!isVisible || !filePath) {
      return clearLayer;
    }

    const ext = filePath.split(".").pop()?.toLowerCase();

    if (ext === "pmtiles") {
      const stem = filePath.replace(".pmtiles", "");
      const DATA_BASE = import.meta.env.VITE_DATA_BASE_URL ?? "";
      const url = `${DATA_BASE}/hazards/${filePath}`;

      if (!map.getPane("hazardPane")) {
        const pane = map.createPane("hazardPane");
        pane.style.zIndex = "450";
      }

      proLayer = leafletLayer({
        sources: { [stem]: { url, maxDataZoom: 14 } },
        pane: "hazardPane",
        maxZoom: 18,
        paintRules: [
          {
            dataSource: stem,
            dataLayer: stem,
            symbolizer: new PolygonSymbolizer({
              fill: color,
              opacity: 0.3,
              stroke: color,
              width: 2,
            }),
          },
          {
            dataSource: stem,
            dataLayer: stem,
            symbolizer: new LineSymbolizer({ color, width: 2, opacity: 0.9 }),
          },
        ],
        labelRules: [],
      });

      if (!isMounted) return clearLayer;

      proLayer.addTo(map);

      if (popupConfig) {
        domClickHandler = (e: MouseEvent) => {
          if (!proLayer) return;
          const latlng = map.mouseEventToLatLng(e);
          const results = proLayer.queryTileFeaturesDebug(latlng.lng, latlng.lat, 5);
          const features = results.get(stem) ?? [];
          if (features.length === 0) return;
          e.stopImmediatePropagation();
          const content = createPopupContent(features[0].feature.props, popupConfig!);
          currentPopup = L.popup().setLatLng(latlng).setContent(content).openOn(map);
        };
        map.getContainer().addEventListener("click", domClickHandler, true);
      }
    } else if (["tif", "tiff", "geotiff"].includes(ext ?? "")) {
      // DEPRECATED — placeholder TIF branch predating the PMTiles migration. Hazard layers now
      // use PMTiles via protomaps-leaflet (see the pmtiles branch above). COG/TiTiler raster
      // rendering is handled by RasterLayerRenderer, not here. Pending deletion.
      const renderRaster = async () => {
        try {
          const response = await fetch(filePath);
          if (!response.ok || !isMounted) return;
          const arrayBuffer = await response.arrayBuffer();
          if (!isMounted) return;

          const georaster = await parseGeoraster(arrayBuffer);
          if (!isMounted) return;

          const rasterLayer = new GeoRasterLayer({
            georaster,
            opacity: 0.7,
            pixelValuesToColorFn: (values: number[] | null) => {
              if (!values || values.length === 0 || values[0] === null) return "rgba(0,0,0,0)";
              const vv = Math.max(0, Math.min(255, Math.round(values[0])));
              return `rgb(${vv}, ${vv}, ${vv})`;
            },
          });
          rasterLayer.addTo(map);
        } catch (err) {
          console.error("Error loading raster layer:", err);
        }
      };
      renderRaster();
    }

    return () => {
      isMounted = false;
      clearLayer();
    };
  }, [map, filePath, isVisible, popupConfig, color]);

  return null;
};

const createPopupContent = (
  props: Record<string, unknown>,
  popupConfig: { titleField?: string; fields?: Array<{ key: string; label: string }> },
) => {
  const title = (props?.[popupConfig.titleField ?? ""] as string) || "Hazard Info";
  let html = `<h3>${title}</h3>`;
  if (popupConfig.fields && popupConfig.fields.length > 0) {
    html += "<ul>";
    popupConfig.fields.forEach((f) => {
      const value = props?.[f.key];
      if (value !== undefined && value !== null) {
        html += `<li><strong>${f.label}:</strong> ${value}</li>`;
      }
    });
    html += "</ul>";
  }
  return html;
};
