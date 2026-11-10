import React, { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { useMapRaster } from "../../stores/useMapLayersStore";
import { apiUrl, getRasterValue, rasterPath } from "../../api/client";
import { useRasterInfo } from "../../api/queries/rasterInfo";
import type { RasterSource } from "../../types";

interface RasterLayerRendererProps {
  // Kept the same object while the raster is unchanged, so the tiles aren't rebuilt on every render
  source: RasterSource;
  name: string;
  units?: string;
  colormap: string;
  opacity: number;
  // Whether a click on the raster shows the value there
  clickable: boolean;
}

// One raster drawn from the tile server. It's mounted only while the raster is shown on the map.
export const RasterLayerRenderer: React.FC<RasterLayerRendererProps> = ({
  source,
  name,
  units,
  colormap,
  opacity,
  clickable,
}) => {
  const map = useMap();

  // References for layer management
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const clickHandlerRef = useRef<((e: MouseEvent) => void) | null>(null);
  const popupRef = useRef<L.Popup | null>(null);
  const tilesLoadedRef = useRef(false);

  const cogInfo = useRasterInfo(source);

  // Build and add the tile layer once the raster's range and extent are known.
  // Re-runs when colormap or opacity changes, replacing the tile layer with an updated URL.
  useEffect(() => {
    if (!cogInfo) return;

    if (!map.getPane("rasterPane")) {
      const pane = map.createPane("rasterPane");
      pane.style.zIndex = "350";
    }

    const tileUrl =
      apiUrl(rasterPath(source, "tiles/WebMercatorQuad/{z}/{x}/{y}.webp")) +
      `&colormap_name=${encodeURIComponent(colormap)}` +
      `&rescale=${cogInfo.min},${cogInfo.max}`;

    // bounds constrains Leaflet to only request tiles within the COG extent,
    tilesLoadedRef.current = false;
    const tileLayer = L.tileLayer(tileUrl, {
      opacity,
      attribution: "",
      pane: "rasterPane",
      bounds: cogInfo.bounds,
    });
    tileLayer.on("load", () => {
      tilesLoadedRef.current = true;
    });
    tileLayer.addTo(map);
    tileLayerRef.current = tileLayer;

    return () => {
      tileLayer.remove();
      tileLayerRef.current = null;
      tilesLoadedRef.current = false;
    };
  }, [cogInfo, colormap, opacity, map, source]);

  // Capture-phase click handler: samples the rendered tile's alpha channel to check for raster
  // data before stopping propagation, mirroring the hazard layer's synchronous hit-test pattern.
  useEffect(() => {
    if (!cogInfo || !clickable) return;

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
        const data = await getRasterValue(source, lng, lat);
        const value = data.values?.[0] ?? null;
        if (value === null) return;
        const content = `<b>${name}</b><br/>${value.toFixed(2)}${units ? " " + units : ""}`;
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
  }, [clickable, cogInfo, map, source, name, units]);

  // Cleanup tile layer, popup, and click handler on unmount (the raster was turned off)
  useEffect(() => {
    return () => {
      tileLayerRef.current?.remove();
      if (clickHandlerRef.current)
        map.getContainer().removeEventListener("click", clickHandlerRef.current);
      if (popupRef.current) {
        popupRef.current.close();
        popupRef.current = null;
      }
    };
  }, [map]);

  return null;
};

interface MapRasterLayerProps {
  mapId: string;
  // Whether a click on a saved raster shows the value there; HCDP never does
  clickable: boolean;
}

// The map's raster, saved or HCDP, if it has one
export const MapRasterLayer: React.FC<MapRasterLayerProps> = ({ mapId, clickable }) => {
  const shown = useMapRaster(mapId);
  if (!shown) return null;

  return (
    <RasterLayerRenderer
      source={shown.source}
      name={shown.name}
      units={shown.units}
      colormap={shown.colormap}
      opacity={shown.opacity}
      clickable={clickable && shown.raster.kind === "cog"}
    />
  );
};