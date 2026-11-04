import React, { useEffect, useMemo, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { useRasterLayersStore } from "../../stores";

const TILES_COG_BASE = "/api/tiles/cog";

interface RasterLayerRendererProps {
  parentId: string;
  layerId?: string;
  mapId: string;
  interactionMode?: "raster" | "social";
}

export const RasterLayerRenderer: React.FC<RasterLayerRendererProps> = ({
  parentId,
  layerId,
  mapId,
  interactionMode = "raster",
}) => {
  const map = useMap();

  const activeLayerId = useMemo(
    () => (layerId ? `${parentId}.${layerId}` : parentId),
    [parentId, layerId],
  );

  // References for layer management
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const clickHandlerRef = useRef<((e: MouseEvent) => void) | null>(null);
  const popupRef = useRef<L.Popup | null>(null);
  const tilesLoadedRef = useRef(false);

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

  const colormapName = colormapOverride ?? layerConfig?.colormapName ?? "blues";
  const opacity = layerConfig?.opacity ?? 0.7;
  const units = layerConfig?.units;
  const layerName = layerConfig?.name ?? activeLayerId;

  // Build and add the tile layer when the layer becomes visible and COG info is available.
  // Re-runs when colormap or opacity changes, replacing the tile layer with an updated URL.
  useEffect(() => {
    if (!isVisible || !cogInfo) return;

    if (!map.getPane("rasterPane")) {
      const pane = map.createPane("rasterPane");
      pane.style.zIndex = "350";
    }

    const tileUrl =
      `${TILES_COG_BASE}/tiles/WebMercatorQuad/{z}/{x}/{y}.webp` +
      `?raster_id=${encodeURIComponent(activeLayerId)}` +
      `&colormap_name=${encodeURIComponent(colormapName)}` +
      `&rescale=${cogInfo.min},${cogInfo.max}`;

    // bounds constrains Leaflet to only request tiles within the COG extent,
    tilesLoadedRef.current = false;
    const tileLayer = L.tileLayer(tileUrl, {
      opacity,
      attribution: "",
      pane: "rasterPane",
      ...(cogInfo.bounds ? { bounds: cogInfo.bounds } : {}),
    });
    tileLayer.on("load", () => {
      tilesLoadedRef.current = true;
    });
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
      tilesLoadedRef.current = false;
    };
  }, [isVisible, cogInfo, colormapName, opacity, map, mapId, activeLayerId, layerName, units]);

  // Capture-phase click handler: samples the rendered tile's alpha channel to check for raster
  // data before stopping propagation, mirroring the hazard layer's synchronous hit-test pattern.
  useEffect(() => {
    if (!isVisible || !cogInfo) return;

    if (interactionMode === "social") {
      return;
    }

    // Sample the rendered tile's alpha at the click pixel — transparent means no-data.
    const hasRasterAtPoint = (latlng: L.LatLng): boolean => {
      if (!tilesLoadedRef.current) return false;

      const tileLayer = tileLayerRef.current;
      if (!tileLayer) return false;

      const tileZoom: number | undefined = (tileLayer as any)._tileZoom;
      if (tileZoom == null) return false;

      const tileSize = tileLayer.getTileSize().x;
      const point = map.project(latlng, tileZoom);
      const tileX = Math.floor(point.x / tileSize);
      const tileY = Math.floor(point.y / tileSize);
      const tileKey = `${tileX}:${tileY}:${tileZoom}`;

      const tiles = (tileLayer as any)._tiles as
        | Record<string, { el: HTMLImageElement }>
        | undefined;
      const tile = tiles?.[tileKey];
      if (!tile || !tile.el.complete || tile.el.naturalWidth === 0) return false;

      try {
        const canvas = document.createElement("canvas");
        canvas.width = tileSize;
        canvas.height = tileSize;
        const ctx = canvas.getContext("2d");
        if (!ctx) return false;
        ctx.drawImage(tile.el, 0, 0);
        const pixelX = Math.max(0, Math.min(tileSize - 1, Math.floor(point.x % tileSize)));
        const pixelY = Math.max(0, Math.min(tileSize - 1, Math.floor(point.y % tileSize)));
        return ctx.getImageData(pixelX, pixelY, 1, 1).data[3] > 0;
      } catch {
        return false;
      }
    };

    const handler = async (e: MouseEvent) => {
      const latlng = map.mouseEventToLatLng(e);
      if (!hasRasterAtPoint(latlng)) return;

      if (popupRef.current) {
        popupRef.current.remove();
        popupRef.current = null;
      }

      e.stopImmediatePropagation();

      const { lng, lat } = latlng;
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
        popupRef.current = L.popup().setLatLng(latlng).setContent(content).openOn(map);
      } catch {
        // silently ignore out-of-bounds or failed requests
      }
    };

    clickHandlerRef.current = handler;
    map.getContainer().addEventListener("click", handler);

    return () => {
      map.getContainer().removeEventListener("click", handler);
      clickHandlerRef.current = null;
    };
  }, [interactionMode, isVisible, cogInfo, map, activeLayerId, layerName, units]);

  // Remove tile layer, popup, and legend when visibility is toggled off
  useEffect(() => {
    if (isVisible) return;
    tileLayerRef.current?.remove();
    tileLayerRef.current = null;
    if (popupRef.current) {
      popupRef.current.close();
      popupRef.current = null;
    }
    useRasterLayersStore.getState().setRasterLegend(mapId, null);
  }, [isVisible, mapId]);

  // Cleanup tile layer, popup, and click handler on unmount
  useEffect(() => {
    return () => {
      tileLayerRef.current?.remove();
      if (clickHandlerRef.current)
        map.getContainer().removeEventListener("click", clickHandlerRef.current);
      if (popupRef.current) {
        popupRef.current.close();
        popupRef.current = null;
      }
      useRasterLayersStore.getState().setRasterLegend(mapId, null);
    };
  }, [map, mapId]);

  return null;
};