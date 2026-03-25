import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import { useRasterLayersStore, useRasterLayerData } from "../../stores";
import { DataProcessorService } from "./data-processor.service";
import { initializeRasterLayer, R, RasterOptions } from "./leaflet-raster-layer.service";
import { ColorGeneratorService } from "./color-generator.service";
import { ColorScale } from "./colorScale";
import { RasterData } from "./RasterData";

interface RasterLayerRendererProps {
  parentId: string;
  layerId?: string;
  mapZoom: number;
  mapId: string;
}

/** Optional custom zoom → overview rules */
const getOverviewForZoom = (
  zoom: number,
  rules?: { minZoom: number; maxZoom: number; overviewIndex: number }[],
): number | null => {
  if (!rules) return null;
  return rules.find((r) => zoom >= r.minZoom && zoom <= r.maxZoom)?.overviewIndex ?? null;
};

export const RasterLayerRenderer: React.FC<RasterLayerRendererProps> = ({
  parentId,
  layerId,
  mapZoom,
  mapId,
}) => {
  const map = useMap();

  // References for layer management
  const activeLayerRef = useRef<L.Layer | null>(null);
  const pendingLayerRef = useRef<L.Layer | null>(null);
  const currentOverviewRef = useRef<number | null>(null);
  const loadIdRef = useRef(0);

  // Services
  const dataProcessorRef = useRef<DataProcessorService | null>(null);
  const colorGeneratorRef = useRef<ColorGeneratorService | null>(null);

  // Local state for rendering
  const [leafletLayer, setLeafletLayer] = useState<L.Layer | null>(null);
  const [rasterData, setRasterData] = useState<RasterData | null>(null);
  const [colorScale, setColorScale] = useState<ColorScale | null>(null);

  // Get config from store
  const rasterLayerConfigs = useRasterLayersStore((state) => state.rasterLayerConfigs);

  const { layerConfig, activeLayerId } = useMemo(() => {
    const parent = rasterLayerConfigs.find((r) => r.id === parentId);
    const sub =
      layerId && parent?.subLayers ? parent.subLayers.find((s) => s.id === layerId) : undefined;
    return {
      layerConfig: sub ?? parent,
      activeLayerId: layerId ? `${parentId}.${layerId}` : parentId,
    };
  }, [rasterLayerConfigs, parentId, layerId]);

  // Get visibility and data from store
  //const isVisible = useIsRasterLayerVisible(activeLayerId);
  const isVisible = useRasterLayersStore((state) => {
    const mapLayers = state.visibleLayerIdsByMap[mapId];
    return mapLayers ? mapLayers.has(activeLayerId) : false;
  });
  const arrayBuffer = useRasterLayerData(activeLayerId);

  const opacity = layerConfig?.opacity ?? 0.7;

  // Initialize services
  useEffect(() => {
    if (!dataProcessorRef.current) {
      dataProcessorRef.current = new DataProcessorService();
    }
    if (!colorGeneratorRef.current) {
      colorGeneratorRef.current = new ColorGeneratorService();
    }
  }, []);

  // Cleanup layers on unmount
  useEffect(() => {
    return () => {
      if (!map) return;

      if (activeLayerRef.current && map.hasLayer(activeLayerRef.current)) {
        map.removeLayer(activeLayerRef.current);
      }
      if (pendingLayerRef.current && map.hasLayer(pendingLayerRef.current)) {
        map.removeLayer(pendingLayerRef.current);
      }

      activeLayerRef.current = null;
      pendingLayerRef.current = null;
      currentOverviewRef.current = null;
    };
  }, [map]);

  // Remove layers when visibility is toggled off
  useEffect(() => {
    if (!map || isVisible) return;

    if (activeLayerRef.current && map.hasLayer(activeLayerRef.current)) {
      map.removeLayer(activeLayerRef.current);
    }
    if (pendingLayerRef.current && map.hasLayer(pendingLayerRef.current)) {
      map.removeLayer(pendingLayerRef.current);
    }

    activeLayerRef.current = null;
    pendingLayerRef.current = null;
    currentOverviewRef.current = null;

    setLeafletLayer(null);
    setRasterData(null);
  }, [isVisible, map]);

  // Process and render raster when data is available or zoom changes
  useEffect(() => {
    if (!map || !isVisible || !arrayBuffer) return;
    if (!dataProcessorRef.current || !colorGeneratorRef.current) return;

    let cancelled = false;
    const loadId = ++loadIdRef.current;

    const processAndRender = async () => {
      try {
        // Calculate overview index based on zoom
        const overviewIndex =
          getOverviewForZoom(mapZoom, layerConfig?.overviewZoom) ??
          (mapZoom <= 7 ? 4 : mapZoom <= 8 ? 3 : mapZoom <= 9 ? 2 : mapZoom <= 10 ? 1 : 0);

        // Skip if same overview is already rendered
        if (currentOverviewRef.current === overviewIndex && activeLayerRef.current) {
          return;
        }

        // Process the ArrayBuffer into raster data
        if (!dataProcessorRef.current) return;
        const raster = await dataProcessorRef.current.getRasterDataFromGeoTIFFArrayBuffer(
          arrayBuffer,
          undefined,
          [0],
          1,
          overviewIndex,
        );

        if (!raster || cancelled || loadId !== loadIdRef.current) return;

        const bands = raster.getBands();
        const bandKeys = Object.keys(bands);
        if (!bandKeys.length) return;

        const band = bands[bandKeys[0]];
        const header = raster.getHeader();
        if (!band || !header) return;

        setRasterData(raster);

        // Calculate min/max for color scale
        let min = Infinity,
          max = -Infinity;
        band.forEach((v) => {
          if (!isNaN(v)) {
            min = Math.min(min, v);
            max = Math.max(max, v);
          }
        });

        if (!colorGeneratorRef.current) return;
        const scale = colorGeneratorRef.current.getDefaultMonochromaticRainfallColorScale(
          [min, max],
          false,
        );

        setColorScale(scale);

        // Create and add the Leaflet layer
        initializeRasterLayer();

        const rasterLayer = (R as any).gridLayer.RasterLayer({
          cacheEmpty: true,
          colorScale: scale,
          data: { header, values: band },
        } as RasterOptions);

        rasterLayer.setOpacity(opacity);
        rasterLayer.addTo(map);
        pendingLayerRef.current = rasterLayer;

        // Swap layers once new one is loaded
        rasterLayer.once("load", () => {
          if (cancelled || loadId !== loadIdRef.current || !isVisible) {
            map.removeLayer(rasterLayer);
            return;
          }

          if (activeLayerRef.current && map.hasLayer(activeLayerRef.current)) {
            map.removeLayer(activeLayerRef.current);
          }

          activeLayerRef.current = rasterLayer;
          pendingLayerRef.current = null;
          currentOverviewRef.current = overviewIndex;
          setLeafletLayer(rasterLayer);
        });
      } catch (err) {
        console.error("[RasterLayerRenderer]", err);
      }
    };

    processAndRender();

    return () => {
      cancelled = true;
    };
  }, [map, mapZoom, arrayBuffer, isVisible, opacity, layerConfig?.overviewZoom]);

  // Update opacity when it changes
  useEffect(() => {
    if (leafletLayer) {
      (leafletLayer as any).setOpacity(opacity);
    }
  }, [leafletLayer, opacity]);

  // Update color scale when it changes
  useEffect(() => {
    if (leafletLayer && colorScale && rasterData) {
      (leafletLayer as any).setColorScale(colorScale);
    }
  }, [leafletLayer, colorScale, rasterData]);

  return null;
};
