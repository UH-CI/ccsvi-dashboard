// DEPRECATED IMPORTS — replaced by TiTiler/COG integration
// The services below drove the client-side ArrayBuffer decode + custom GridLayer renderer
// Preserved because HCDPRasterLayer.tsx (src/components/HCDP/) uses a parallel
// ArrayBuffer → GeoRasterLayer pattern that may eventually adopt a similar approach
// Pending deletion once deprecated service files are cleaned up
//
// import { useRasterLayerData } from "../../stores";
// import { DataProcessorService } from "./data-processor.service";
// import { initializeRasterLayer, R, RasterOptions } from "./leaflet-raster-layer.service";
// import { ColorGeneratorService } from "./color-generator.service";
// import { ColorScale } from "./colorScale";
// import { RasterData } from "./RasterData";

import React, { useEffect, useMemo, useRef } from "react";
import { useMap } from "react-leaflet";
import L, { LeafletMouseEvent } from "leaflet";
import { useRasterLayersStore } from "../../stores";

const TILES_COG_BASE = "/api/tiles/cog";

interface RasterLayerRendererProps {
  parentId: string;
  layerId?: string;
  /** Kept for interface compatibility — TiTiler selects overview level per tile automatically. */
  mapZoom?: number;
  mapId: string;
}

export const RasterLayerRenderer: React.FC<RasterLayerRendererProps> = ({
  parentId,
  layerId,
  mapId,
}) => {
  const map = useMap();

  const activeLayerId = useMemo(
    () => (layerId ? `${parentId}.${layerId}` : parentId),
    [parentId, layerId],
  );

  // References for layer management
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const clickHandlerRef = useRef<((e: LeafletMouseEvent) => void) | null>(null);

  // DEPRECATED — service refs for client-side ArrayBuffer decode + GridLayer render.
  // Replaced by TiTiler tile URL and /point endpoint. Pending deletion.
  //
  // const dataProcessorRef = useRef<DataProcessorService | null>(null);
  // const colorGeneratorRef = useRef<ColorGeneratorService | null>(null);

  // DEPRECATED — local render state driven by ArrayBuffer decode pipeline.
  // Replaced by cogInfo (min/max) from the store. Pending deletion.
  //
  // const [leafletLayer, setLeafletLayer] = useState<L.Layer | null>(null);
  // const [rasterData, setRasterData] = useState<RasterData | null>(null);
  // const [colorScale, setColorScale] = useState<ColorScale | null>(null);

  // Get config from store
  const rasterLayerConfigs = useRasterLayersStore((s) => s.rasterLayerConfigs);

  const layerConfig = useMemo(() => {
    const parent = rasterLayerConfigs.find((r) => r.id === parentId);
    const sub =
      layerId && parent?.subLayers ? parent.subLayers.find((s) => s.id === layerId) : undefined;
    return sub ?? parent;
  }, [rasterLayerConfigs, parentId, layerId]);

  // Get visibility and COG info from store
  const isVisible = useRasterLayersStore(
    (s) => s.visibleLayerIdsByMap[mapId]?.has(activeLayerId) ?? false,
  );
  const cogInfo = useRasterLayersStore((s) => s.cogInfoCache.get(activeLayerId));
  const colormapOverride = useRasterLayersStore(
    (s) => s.colormapOverrides[mapId]?.[activeLayerId],
  );

  // DEPRECATED — arrayBuffer was the full TIF file downloaded into memory.
  // Replaced by cogInfo (min/max) fetched from /statistics on toggle-on. Pending deletion.
  //
  // const arrayBuffer = useRasterLayerData(activeLayerId);

  const colormapName = colormapOverride ?? layerConfig?.colormapName ?? "blues";
  const opacity = layerConfig?.opacity ?? 0.7;
  const units = layerConfig?.units;
  const layerName = layerConfig?.name ?? activeLayerId;

  // DEPRECATED — service initialization effect.
  // DataProcessorService spun up a Web Worker for TIFF decoding; no longer needed.
  // Pending deletion.
  //
  // useEffect(() => {
  //   if (!dataProcessorRef.current) dataProcessorRef.current = new DataProcessorService();
  //   if (!colorGeneratorRef.current) colorGeneratorRef.current = new ColorGeneratorService();
  // }, []);

  // Build and add the tile layer when the layer becomes visible and COG info is available.
  // Re-runs when colormap or opacity changes, replacing the tile layer with an updated URL.
  useEffect(() => {
    if (!isVisible || !cogInfo) return;

    const tileUrl =
      `${TILES_COG_BASE}/tiles/{z}/{x}/{y}.png` +
      `?raster_id=${encodeURIComponent(activeLayerId)}` +
      `&colormap_name=${encodeURIComponent(colormapName)}` +
      `&rescale=${cogInfo.min},${cogInfo.max}`;

    const tileLayer = L.tileLayer(tileUrl, { opacity, attribution: "" });
    tileLayer.addTo(map);
    tileLayerRef.current = tileLayer;

    // Update legend whenever colormap or min/max changes
    useRasterLayersStore.getState().setRasterLegend(mapId, {
      layerId: activeLayerId,
      title: layerName,
      min: cogInfo.min,
      max: cogInfo.max,
      colormapName,
      units,
    });

    return () => {
      tileLayer.remove();
      tileLayerRef.current = null;
    };
  }, [isVisible, cogInfo, colormapName, opacity, map, mapId, activeLayerId, layerName, units]);

  // Register click-to-query handler when the layer is visible.
  // Calls TiTiler /point endpoint; opens popup with formatted value and units.
  useEffect(() => {
    if (!isVisible) return;

    const handler = async (e: LeafletMouseEvent) => {
      const { lng, lat } = e.latlng;
      try {
        const res = await fetch(
          `${TILES_COG_BASE}/point/${lng},${lat}` +
            `?raster_id=${encodeURIComponent(activeLayerId)}`,
        );
        if (!res.ok) return;
        const data = await res.json();
        const value: number | null = data.values?.[0] ?? null;
        if (value === null) return;
        const content = `<b>${layerName}</b><br/>${value.toFixed(2)}${units ? " " + units : ""}`;
        L.popup().setLatLng(e.latlng).setContent(content).openOn(map);
      } catch {
        // Point is outside COG bounds or request failed — silently ignore.
      }
    };

    clickHandlerRef.current = handler;
    map.on("click", handler);

    return () => {
      map.off("click", handler);
      clickHandlerRef.current = null;
    };
  }, [isVisible, map, activeLayerId, layerName, units]);

  // Remove tile layer and legend when visibility is toggled off
  useEffect(() => {
    if (isVisible) return;
    tileLayerRef.current?.remove();
    tileLayerRef.current = null;
    useRasterLayersStore.getState().setRasterLegend(mapId, null);
  }, [isVisible, mapId]);

  // Cleanup tile layer and click handler on unmount
  useEffect(() => {
    return () => {
      tileLayerRef.current?.remove();
      if (clickHandlerRef.current) map.off("click", clickHandlerRef.current);
      useRasterLayersStore.getState().setRasterLegend(mapId, null);
    };
  }, [map, mapId]);

  // DEPRECATED — old effects for ArrayBuffer decode → GridLayer render pipeline.
  // Replaced by the tile layer and click handler effects above. Pending deletion.
  //
  // "Process and render raster when data is available or zoom changes"
  // useEffect(() => {
  //   if (!map || !isVisible || !arrayBuffer) return;
  //   ... (DataProcessorService.getRasterDataFromGeoTIFFArrayBuffer → ColorGeneratorService
  //        → initializeRasterLayer → R.gridLayer.RasterLayer → layer swap on "load") ...
  // }, [map, mapZoom, arrayBuffer, isVisible, opacity, layerConfig?.overviewZoom, ...]);
  //
  // "Update opacity when it changes"
  // useEffect(() => { if (leafletLayer) (leafletLayer as any).setOpacity(opacity); }, [...]);
  //
  // "Update color scale when it changes"
  // useEffect(() => { if (leafletLayer && colorScale && rasterData) ... }, [...]);

  return null;
};