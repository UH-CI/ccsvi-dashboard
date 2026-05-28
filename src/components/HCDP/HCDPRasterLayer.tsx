import React, { useEffect, useRef } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import chroma from "chroma-js";
import parseGeoraster from "georaster";
import GeoRasterLayer from "georaster-layer-for-leaflet";
import { cloneArrayBuffer } from "../../utils/hcdpRaster";
import { useHCDPStore } from "../../stores/useHCDPStore";

const COLOR_SCALE = chroma.scale(["#313695", "#74add1", "#fee090", "#f46d43", "#a50026"]);
const VIRIDIS_REVERSED = [
  [253, 231, 37], [252, 228, 35], [251, 225, 33], [250, 222, 31],
  [249, 220, 29], [248, 217, 27], [247, 214, 25], [246, 211, 23],
  [245, 208, 21], [244, 205, 19], [243, 202, 17], [242, 199, 15],
  [241, 196, 13], [240, 193, 11], [239, 190, 9], [238, 187, 7],
  [237, 184, 5], [236, 181, 3], [235, 178, 1], [234, 175, 0],
  [233, 173, 0], [232, 171, 1], [231, 169, 2], [230, 167, 3],
  [229, 165, 4], [228, 163, 5], [227, 161, 6], [226, 159, 7],
  [225, 157, 8], [224, 155, 9], [223, 153, 10], [222, 151, 11],
  [221, 149, 12], [220, 147, 13], [219, 145, 14], [218, 143, 15],
  [217, 141, 16], [216, 139, 17], [215, 137, 18], [214, 135, 19],
  [213, 133, 20], [212, 131, 21], [211, 129, 22], [210, 127, 23],
  [209, 125, 24], [208, 123, 25], [207, 121, 26], [206, 119, 27],
  [205, 117, 28], [204, 115, 29], [203, 113, 30], [202, 111, 31],
  [201, 109, 32], [200, 107, 33], [199, 105, 34], [198, 103, 35],
  [197, 101, 36], [196, 99, 37], [195, 97, 38], [194, 95, 39],
  [193, 93, 40], [192, 91, 41], [191, 89, 42], [190, 87, 43],
  [189, 85, 44], [188, 83, 45], [187, 81, 46], [186, 79, 47],
  [185, 77, 48], [184, 75, 49], [183, 73, 50], [182, 71, 51],
  [181, 69, 52], [180, 67, 53], [179, 65, 54], [178, 63, 55],
  [177, 61, 56], [176, 59, 57], [175, 57, 58], [174, 55, 59],
  [173, 53, 60], [172, 51, 61], [171, 49, 62], [170, 47, 63],
  [169, 45, 64], [168, 43, 65], [167, 41, 66], [166, 39, 67],
  [165, 37, 68], [164, 35, 69], [163, 33, 70], [162, 31, 71],
  [161, 29, 72], [160, 27, 73], [159, 25, 74], [158, 23, 75],
  [157, 21, 76], [156, 19, 77], [155, 17, 78], [154, 15, 79],
  [153, 13, 80], [152, 11, 81], [151, 9, 82], [150, 7, 83],
  [149, 5, 84], [148, 3, 85], [147, 1, 86], [146, 0, 87],
  [145, 0, 88], [144, 0, 89], [143, 0, 90], [142, 0, 91],
  [141, 0, 92], [140, 0, 93], [139, 0, 94], [138, 0, 95],
  [137, 0, 96], [136, 0, 97], [135, 0, 98], [134, 0, 99],
  [133, 0, 100], [132, 0, 101], [131, 0, 102], [130, 0, 103],
  [129, 0, 104], [128, 0, 105], [127, 0, 106], [126, 0, 107],
  [125, 0, 108], [124, 0, 109], [123, 0, 110], [122, 0, 111],
  [121, 0, 112], [120, 0, 113], [119, 0, 114], [118, 0, 115],
  [117, 0, 116], [116, 0, 117], [115, 0, 118], [114, 0, 119],
  [113, 0, 120], [112, 0, 121], [111, 0, 122], [110, 0, 123],
  [109, 0, 124], [108, 0, 125], [107, 0, 126], [106, 0, 127],
  [105, 0, 128], [104, 0, 129], [103, 0, 130], [102, 0, 131],
  [101, 0, 132], [100, 0, 133], [99, 0, 134], [98, 0, 135],
  [97, 0, 136], [96, 0, 137], [95, 0, 138], [94, 0, 139],
  [93, 0, 140], [92, 0, 141], [91, 0, 142], [90, 0, 143],
  [89, 0, 144], [88, 0, 145], [87, 0, 146], [86, 0, 147],
  [85, 0, 148], [84, 0, 149], [83, 0, 150], [82, 0, 151],
  [81, 0, 152], [80, 0, 153], [79, 0, 154], [78, 0, 155],
  [77, 0, 156], [76, 0, 157], [75, 0, 158], [74, 0, 159],
  [73, 0, 160], [72, 0, 161], [71, 0, 162], [70, 0, 163],
  [69, 0, 164], [68, 0, 165], [67, 0, 166], [66, 0, 167],
  [65, 0, 168], [64, 0, 169], [63, 0, 170], [62, 0, 171],
  [61, 0, 172], [60, 0, 173], [59, 0, 174], [58, 0, 175],
];
const VIRIDIS = [
  [58, 0, 175], [59, 0, 174], [60, 0, 173], [61, 0, 172],
  [62, 0, 171], [63, 0, 170], [64, 0, 169], [65, 0, 168],
  [66, 0, 167], [67, 0, 166], [68, 0, 165], [69, 0, 164],
  [70, 0, 163], [71, 0, 162], [72, 0, 161], [73, 0, 160],
  [74, 0, 159], [75, 0, 158], [76, 0, 157], [77, 0, 156],
  [78, 0, 155], [79, 0, 154], [80, 0, 153], [81, 0, 152],
  [82, 0, 151], [83, 0, 150], [84, 0, 149], [85, 0, 148],
  [86, 0, 147], [87, 0, 146], [88, 0, 145], [89, 0, 144],
  [90, 0, 143], [91, 0, 142], [92, 0, 141], [93, 0, 140],
  [94, 0, 139], [95, 0, 138], [96, 0, 137], [97, 0, 136],
  [98, 0, 135], [99, 0, 134], [100, 0, 133], [101, 0, 132],
  [102, 0, 131], [103, 0, 130], [104, 0, 129], [105, 0, 128],
  [106, 0, 127], [107, 0, 126], [108, 0, 125], [109, 0, 124],
  [110, 0, 123], [111, 0, 122], [112, 0, 121], [113, 0, 120],
  [114, 0, 119], [115, 0, 118], [116, 0, 117], [117, 0, 116],
  [118, 0, 115], [119, 0, 114], [120, 0, 113], [121, 0, 112],
  [122, 0, 111], [123, 0, 110], [124, 0, 109], [125, 0, 108],
  [126, 0, 107], [127, 0, 106], [128, 0, 105], [129, 0, 104],
  [130, 0, 103], [131, 0, 102], [132, 0, 101], [133, 0, 100],
  [134, 0, 99], [135, 0, 98], [136, 0, 97], [137, 0, 96],
  [138, 0, 95], [139, 0, 94], [140, 0, 93], [141, 0, 92],
  [142, 0, 91], [143, 0, 90], [144, 0, 89], [145, 0, 88],
  [146, 0, 87], [147, 1, 86], [148, 3, 85], [149, 5, 84],
  [150, 7, 83], [151, 9, 82], [152, 11, 81], [153, 13, 80],
  [154, 15, 79], [155, 17, 78], [156, 19, 77], [157, 21, 76],
  [158, 23, 75], [159, 25, 74], [160, 27, 73], [161, 29, 72],
  [162, 31, 71], [163, 33, 70], [164, 35, 69], [165, 37, 68],
  [166, 39, 67], [167, 41, 66], [168, 43, 65], [169, 45, 64],
  [170, 47, 63], [171, 49, 62], [172, 51, 61], [173, 53, 60],
  [174, 55, 59], [175, 57, 58], [176, 59, 57], [177, 61, 56],
  [178, 63, 55], [179, 65, 54], [180, 67, 53], [181, 69, 52],
  [182, 71, 51], [183, 73, 50], [184, 75, 49], [185, 77, 48],
  [186, 79, 47], [187, 81, 46], [188, 83, 45], [189, 85, 44],
  [190, 87, 43], [191, 89, 42], [192, 91, 41], [193, 93, 40],
  [194, 95, 39], [195, 97, 38], [196, 99, 37], [197, 101, 36],
  [198, 103, 35], [199, 105, 34], [200, 107, 33], [201, 109, 32],
  [202, 111, 31], [203, 113, 30], [204, 115, 29], [205, 117, 28],
  [206, 119, 27], [207, 121, 26], [208, 123, 25], [209, 125, 24],
  [210, 127, 23], [211, 129, 22], [212, 131, 21], [213, 133, 20],
  [214, 135, 19], [215, 137, 18], [216, 139, 17], [217, 141, 16],
  [218, 143, 15], [219, 145, 14], [220, 147, 13], [221, 149, 12],
  [222, 151, 11], [223, 153, 10], [224, 155, 9], [225, 157, 8],
  [226, 159, 7], [227, 161, 6], [228, 163, 5], [229, 165, 4],
  [230, 167, 3], [231, 169, 2], [232, 171, 1], [233, 173, 0],
  [234, 175, 0], [235, 178, 1], [236, 181, 3], [237, 184, 5],
  [238, 187, 7], [239, 190, 9], [240, 193, 11], [241, 196, 13],
  [242, 199, 15], [243, 202, 17], [244, 205, 19], [245, 208, 21],
  [246, 211, 23], [247, 214, 25], [248, 217, 27], [249, 220, 29],
  [250, 222, 31], [251, 225, 33], [252, 228, 35], [253, 231, 37]
];

const VIRIDIS_2 = [
  [68, 1, 84],    // Deep Purple (Low)
  [71, 20, 102],
  [71, 37, 117],
  [69, 54, 129],
  [63, 69, 135],  // Blue-Purple
  [57, 85, 139],
  [50, 98, 141],
  [44, 112, 142], // Ocean Blue
  [39, 124, 142],
  [34, 137, 141], // Teal
  [31, 150, 139],
  [31, 163, 134], // Emerald Green
  [41, 175, 127],
  [61, 187, 116],
  [85, 198, 102], // Lime Green
  [116, 208, 84],
  [149, 215, 63],
  [186, 222, 39], // Chartreuse
  [220, 226, 24],
  [253, 231, 36]  // Bright Yellow (High)
];


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
              data[pixelIndex]     = 0; // R
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
              data[pixelIndex]     = rgb[0];
              data[pixelIndex + 1] = rgb[1];
              data[pixelIndex + 2] = rgb[2];
              data[pixelIndex + 3] = Math.floor(0.85 * 255); 
            }
          }
        }
        ctx.putImageData(imageData, 0, 0);

        const bounds = L.latLngBounds([
          [georaster.ymin, georaster.xmin],
          [georaster.ymax, georaster.xmax]
        ]);

        if (cancelled) return;
        clearLayer();

        const imageOverlay = L.imageOverlay(canvas.toDataURL(), bounds, {
          opacity: 0.75,
          interactive: false
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
