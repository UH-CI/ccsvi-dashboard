import React, { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { useMapRaster } from "../../stores/useMapLayersStore";
import { apiUrl, getRasterValue, rasterPath } from "../../api/client";
import { useRasterInfo } from "../../api/queries/rasterInfo";
import type { RasterSource } from "../../types";
import { addClickTarget, CLICK_ORDER } from "../../utils/mapClicks";
import { ensurePane } from "../../utils/mapPanes";
import { FeaturePopup } from "../FeaturePopup";

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
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  // The tile images on the map now, by "x:y:zoom", kept from the layer's tile events
  const tilesRef = useRef(new Map<string, HTMLImageElement>());

  const cogInfo = useRasterInfo(source);

  // Build and add the tile layer once the raster's range and extent are known.
  // Re-runs when colormap or opacity changes, replacing the tile layer with an updated URL.
  useEffect(() => {
    if (!cogInfo) return;

    const tileUrl =
      apiUrl(rasterPath(source, "tiles/WebMercatorQuad/{z}/{x}/{y}.webp")) +
      `&colormap_name=${encodeURIComponent(colormap)}` +
      `&rescale=${cogInfo.min},${cogInfo.max}`;

    // bounds constrains Leaflet to only request tiles within the COG extent
    const tileLayer = L.tileLayer(tileUrl, {
      opacity,
      attribution: "",
      pane: ensurePane(map, "rasterPane"),
      bounds: cogInfo.bounds,
    });
    const tiles = tilesRef.current;
    tileLayer.on("tileload", (e: L.TileEvent) => tiles.set(tileKey(e.coords), e.tile));
    tileLayer.on("tileunload", (e: L.TileEvent) => tiles.delete(tileKey(e.coords)));
    tileLayer.addTo(map);
    tileLayerRef.current = tileLayer;

    return () => {
      tileLayer.remove();
      tileLayerRef.current = null;
      tiles.clear();
    };
  }, [cogInfo, colormap, opacity, map, source]);

  // A click where the raster has a value shows that value
  useEffect(() => {
    if (!clickable) return;

    // Whether the drawn tile under the point has colour there; no data is drawn transparent
    const hasValueAt = (latlng: L.LatLng): boolean => {
      const tileLayer = tileLayerRef.current;
      if (!tileLayer) return false;
      // The zoom Leaflet loads this layer's tiles for
      const zoom = Math.min(Math.round(map.getZoom()), tileLayer.options.maxZoom!);
      const size = tileLayer.getTileSize().x;
      const point = map.project(latlng, zoom);
      const tile = tilesRef.current.get(
        tileKey({ x: Math.floor(point.x / size), y: Math.floor(point.y / size), z: zoom }),
      );
      if (!tile?.complete || tile.naturalWidth === 0) return false;

      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d")!;
      context.drawImage(tile, 0, 0);
      const x = Math.min(size - 1, Math.floor(point.x % size));
      const y = Math.min(size - 1, Math.floor(point.y % size));
      return context.getImageData(x, y, 1, 1).data[3] > 0;
    };

    return addClickTarget(map, CLICK_ORDER.raster, (latlng) => {
      if (!hasValueAt(latlng)) return null;
      // A point the server has no value for shows no popup
      return getRasterValue(source, latlng.lng, latlng.lat)
        .then(({ values }) => {
          const value = values?.[0] ?? null;
          return value === null ? null : valuePopup(name, units, value);
        })
        .catch(() => null);
    });
  }, [clickable, map, source, name, units]);

  return null;
};

const tileKey = ({ x, y, z }: { x: number; y: number; z: number }) => `${x}:${y}:${z}`;

// The raster's name, then its value at the clicked point
const valuePopup = (name: string, units: string | undefined, value: number) =>
  FeaturePopup({
    metadata: [name],
    properties: { value: `${value.toFixed(2)}${units ? ` ${units}` : ""}` },
    fields: [{ key: "value", label: "Value" }],
  });

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
