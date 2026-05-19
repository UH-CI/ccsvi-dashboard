import React, { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import chroma from "chroma-js";
import parseGeoraster from "georaster";
import GeoRasterLayer from "georaster-layer-for-leaflet";
import { cloneArrayBuffer } from "../../utils/hcdpRaster";
import { useHCDPStore } from "../../stores/useHCDPStore";

const COLOR_SCALE = chroma.scale(["#313695", "#74add1", "#fee090", "#f46d43", "#a50026"]);

interface HCDPRasterLayerProps {
  mapId: string;
}

export const HCDPRasterLayer: React.FC<HCDPRasterLayerProps> = ({ mapId }) => {
  const map = useMap();
  const loadId = useHCDPStore((s) => s.overlaysByMap[mapId]?.loadId);
  const arrayBuffer = useHCDPStore((s) => s.overlaysByMap[mapId]?.arrayBuffer);

  useEffect(() => {
    if (!map || !arrayBuffer || loadId == null) return;

    let currentLayer: L.Layer | null = null;
    let cancelled = false;

    const clearLayer = () => {
      if (currentLayer && map.hasLayer(currentLayer)) {
        map.removeLayer(currentLayer);
        currentLayer = null;
      }
    };

    (async () => {
      clearLayer();
      try {
        // georaster transfers the buffer to a worker (detaches it); clone per parse attempt.
        const georaster = await parseGeoraster(cloneArrayBuffer(arrayBuffer));
        if (cancelled) return;

        const min = georaster.mins?.[0] ?? georaster.min ?? 0;
        const max = georaster.maxs?.[0] ?? georaster.max ?? 1;
        const noData = georaster.noDataValue;
        const span = max - min || 1;

        const rasterLayer = new GeoRasterLayer({
          georaster,
          opacity: 0.75,
          pixelValuesToColorFn: (values: number[] | null) => {
            const v = values?.[0];
            if (v == null || Number.isNaN(v) || v === noData) {
              return "rgba(0,0,0,0)";
            }
            const t = Math.max(0, Math.min(1, (v - min) / span));
            return COLOR_SCALE(t).alpha(0.85).css();
          },
        });

        rasterLayer.addTo(map);
        currentLayer = rasterLayer;
      } catch (err) {
        console.error("HCDP raster layer failed to render:", err);
      }
    })();

    return () => {
      cancelled = true;
      clearLayer();
    };
  }, [map, mapId, loadId, arrayBuffer]);

  return null;
};
