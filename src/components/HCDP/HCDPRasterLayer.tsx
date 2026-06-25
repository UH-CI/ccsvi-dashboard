import React, { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import chroma from "chroma-js";
import parseGeoraster from "georaster";
import GeoRasterLayer from "georaster-layer-for-leaflet";
import { cloneArrayBuffer } from "../../utils/hcdpRaster";
import { useHCDPStore } from "../../stores/useHCDPStore";

const COLOR_SCALE = chroma.scale(["#313695", "#74add1", "#fee090", "#f46d43", "#a50026"]);

export function HCDPRasterLayer({ mapId }: { mapId: string }) {
  const map = useMap();
  const overlay = useHCDPStore((s) => s.overlaysByMap[mapId]);

  const activeOverlayRef = useRef<L.ImageOverlay | null>(null);

  useEffect(() => {
    let cancelled = false;

    const clearLayer = () => {
      if (activeOverlayRef.current) {
        if (map.hasLayer(activeOverlayRef.current)) {
          map.removeLayer(activeOverlayRef.current);
        }
        activeOverlayRef.current = null;
      }
    };

    if (!overlay || !overlay.arrayBuffer) {
      clearLayer();
      return;
    }

    (async () => {
      try {
        const georaster = await parseGeoraster(cloneArrayBuffer(overlay.arrayBuffer));
        if (cancelled) return;

        const firstValue = georaster.values?.[0]?.[0]?.[0];
        const metaNoData = georaster.noDataValue;

        const checkIsNoData = (v: number | null | undefined): boolean => {
          if (v == null || Number.isNaN(v)) return true;
          if (v === firstValue) return true;
          if (v === metaNoData) return true;
          if (v === -9999 || v <= -3.4e38) return true;
          return false;
        };

        const band = georaster.values[0];
        const width = georaster.width;
        const height = georaster.height;

        let min = Infinity;
        let max = -Infinity;
        for (let r = 0; r < height; r++) {
          const rowData = band[r];
          if (!rowData) continue;
          for (let c = 0; c < width; c++) {
            const v = rowData[c];
            if (!checkIsNoData(v)) {
              if (v < min) min = v;
              if (v > max) max = v;
            }
          }
        }

        if (min === Infinity || max === -Infinity) {
          min = georaster.mins?.[0] ?? georaster.min ?? 0;
          max = georaster.maxs?.[0] ?? georaster.max ?? 1;
        }
        const span = max - min || 1;

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const imageData = ctx.createImageData(width, height);
        const data = imageData.data;

        for (let r = 0; r < height; r++) {
          const rowData = band[r];
          for (let c = 0; c < width; c++) {
            const v = rowData ? rowData[c] : null;
            const pixelIndex = (r * width + c) * 4;

            if (v == null || checkIsNoData(v)) {
              // Transparent background matches
              data[pixelIndex] = 0; // R
              data[pixelIndex + 1] = 0; // G
              data[pixelIndex + 2] = 0; // B
              data[pixelIndex + 3] = 0; // Alpha (Transparent)
            } else {
              // Scale color spectrum rules
              const t = Math.max(0, Math.min(1, (v - min) / span));
              const rgb = COLOR_SCALE(t).rgba();
              // const colorIndex = Math.floor(t * (VIRIDIS_REVERSED.length - 1));
              // const color = VIRIDIS_REVERSED[colorIndex];
              // const colorIndex = Math.floor(t * (VIRIDIS.length - 1));
              // const color = VIRIDIS[colorIndex];
              // const colorIndex = Math.floor(t * (VIRIDIS_2.length - 1));
              // const color = VIRIDIS_2[colorIndex];

              // return `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.85)`;
              data[pixelIndex] = rgb[0];
              data[pixelIndex + 1] = rgb[1];
              data[pixelIndex + 2] = rgb[2];
              data[pixelIndex + 3] = Math.floor(0.85 * 255);
            }
          }
        }
        ctx.putImageData(imageData, 0, 0);

        const bounds = L.latLngBounds([
          [georaster.ymin, georaster.xmin],
          [georaster.ymax, georaster.xmax],
        ]);

        if (cancelled) return;
        clearLayer();

        const imageOverlay = L.imageOverlay(canvas.toDataURL(), bounds, {
          opacity: 0.75,
          interactive: false,
        });

        activeOverlayRef.current = imageOverlay;
        imageOverlay.addTo(map);
      } catch (err) {
        console.error("Error rendering manual canvas overlay:", err);
      }
    })();

    return () => {
      cancelled = true;
      clearLayer();
    };
  }, [overlay, map]);

  return null;
}
