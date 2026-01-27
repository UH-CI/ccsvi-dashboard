import React, { useEffect, useRef, useState } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import JSZip from 'jszip';
import { useRasterLayersStore } from '../../stores';
import { DataProcessorService } from './data-processor.service';
import { initializeRasterLayer, R, RasterOptions } from './leaflet-raster-layer.service';
import { ColorGeneratorService } from './color-generator.service';
import { ColorScale } from './colorScale';
import { RasterData } from './RasterData';

interface RasterLayerRendererProps {
  parentId: string;
  layerId?: string;
  mapZoom: number;
}

/** Optional custom zoom → overview rules */
const getOverviewForZoom = (
  zoom: number,
  rules?: { minZoom: number; maxZoom: number; overviewIndex: number }[]
): number | null => {
  if (!rules) return null;
  return rules.find(r => zoom >= r.minZoom && zoom <= r.maxZoom)?.overviewIndex ?? null;
};

export const RasterLayerRenderer: React.FC<RasterLayerRendererProps> = ({
  parentId,
  layerId,
  mapZoom
}) => {
  const map = useMap();

// references
  const activeLayerRef = useRef<L.Layer | null>(null);
  const pendingLayerRef = useRef<L.Layer | null>(null);
  const currentOverviewRef = useRef<number | null>(null);
  const loadIdRef = useRef(0);

  const dataProcessorRef = useRef<DataProcessorService | null>(null);
  const colorGeneratorRef = useRef<ColorGeneratorService | null>(null);

// state
  const [leafletLayer, setLeafletLayer] = useState<L.Layer | null>(null);
  const [rasterData, setRasterData] = useState<RasterData | null>(null);
  const [colorScale, setColorScale] = useState<ColorScale | null>(null);

// layer store
  const rasterLayers = useRasterLayersStore(state => state.rasterLayers);
  const parentLayer = rasterLayers.find(r => r.id === parentId);
  const subLayer =
    layerId && parentLayer?.subLayers
      ? parentLayer.subLayers.find(s => s.id === layerId)
      : undefined;

  const layerConfig = subLayer ?? parentLayer;
  const isVisible = !!layerConfig?.visible;
  const filePath = layerConfig?.filePath;
  const opacity = layerConfig?.opacity ?? 0.7;

// init 
  useEffect(() => {
    if (!dataProcessorRef.current) {
      dataProcessorRef.current = new DataProcessorService();
    }
    if (!colorGeneratorRef.current) {
      colorGeneratorRef.current = new ColorGeneratorService();
    }
  }, []);

// removes layers for overview
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

  // removes layers for toggle off 
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

// zoom swapper
  useEffect(() => {
    if (!map || !isVisible || !filePath) return;
    if (!dataProcessorRef.current || !colorGeneratorRef.current) return;

    let cancelled = false;
    const loadId = ++loadIdRef.current;

    const loadRaster = async () => {
      try {
        
        const base = import.meta.env.BASE_URL || '';
        const fullPath =
          filePath.startsWith('http') || filePath.startsWith('/')
            ? filePath
            : `${base}${filePath}`;

        const response = await fetch(fullPath);
        if (!response.ok) throw new Error('Failed to fetch raster');

        let arrayBuffer: ArrayBuffer;
        const ext = filePath.split('.').pop()?.toLowerCase();

        if (ext === 'zip') {
          const zip = await JSZip.loadAsync(await response.blob());
          const tifName = Object.keys(zip.files).find(f =>
            /\.(tif|tiff|geotiff)$/i.test(f)
          );
          if (!tifName) throw new Error('ZIP contains no TIFF');
          arrayBuffer = await zip.file(tifName)!.async('arraybuffer');
        } else {
          arrayBuffer = await response.arrayBuffer();
        }

        // default overview
        const overviewIndex =
          getOverviewForZoom(mapZoom, layerConfig?.overviewZoom) ??
          (mapZoom <= 7 ? 4 :
           mapZoom <= 8 ? 3 :
           mapZoom <= 9 ? 2 :
           mapZoom <= 10 ? 1 : 0);

        if (
          currentOverviewRef.current === overviewIndex &&
          activeLayerRef.current
        ) {
          return;
        }

        // processing 
        if (!dataProcessorRef.current) return;
        const raster =
          await dataProcessorRef.current
            .getRasterDataFromGeoTIFFArrayBuffer(
              arrayBuffer,
              undefined,
              [0],
              1,
              overviewIndex
            );

        if (!raster || cancelled || loadId !== loadIdRef.current) return;

        const bands = raster.getBands();
        const bandKeys = Object.keys(bands);
        if (!bandKeys.length) return;

        const band = bands[bandKeys[0]];
        const header = raster.getHeader();
        if (!band || !header) return;

        setRasterData(raster);

        let min = Infinity, max = -Infinity;
        band.forEach(v => {
          if (!isNaN(v)) {
            min = Math.min(min, v);
            max = Math.max(max, v);
          }
        });

        if (!colorGeneratorRef.current) return;
        const scale =
          colorGeneratorRef.current
            .getDefaultMonochromaticRainfallColorScale([min, max], false);

        setColorScale(scale);

        // generate next layer
        initializeRasterLayer();

        const rasterLayer = (R as any).gridLayer.RasterLayer({
          cacheEmpty: true,
          colorScale: scale,
          data: { header, values: band }
        } as RasterOptions);

        rasterLayer.setOpacity(opacity);
        rasterLayer.addTo(map);
        pendingLayerRef.current = rasterLayer;

        // swap to following zoom level once load completes
        rasterLayer.once('load', () => {
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
        console.error('[RasterLayerRenderer]', err);
      }
    };

    loadRaster();

    return () => {
      cancelled = true;
    };
  }, [map, mapZoom, filePath, isVisible, opacity]);

  // update 
  useEffect(() => {
    if (leafletLayer) {
      (leafletLayer as any).setOpacity(opacity);
    }
  }, [leafletLayer, opacity]);

  useEffect(() => {
    if (leafletLayer && colorScale && rasterData) {
      (leafletLayer as any).setColorScale(colorScale);
    }
  }, [leafletLayer, colorScale, rasterData]);

  return null;
};
