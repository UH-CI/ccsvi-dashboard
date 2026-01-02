import React, { useEffect, useState, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import JSZip from 'jszip';
import { useRasterLayersStore } from '../../stores';
//import type { RasterLayerConfig, SubRasterLayerConfig } from '../../types';
import { DataProcessorService } from './data-processor.service';
import { initializeRasterLayer, R, RasterOptions } from './leaflet-raster-layer.service';
import { ColorGeneratorService } from './color-generator.service';
import { ColorScale } from './colorScale';
import { RasterData } from './RasterData';


interface RasterLayerRendererProps {
  parentId: string;
  layerId?: string;
  mapZoom: number; // optional: can render parent or sublayer
}

const getOverviewForZoom = (
  zoom: number,
  rules: {
      minZoom: number;
      maxZoom: number;
      overviewIndex: number;
  }[]
) => {
  return rules.find(r => zoom >= r.minZoom && zoom <= r.maxZoom)?.overviewIndex ?? 0;
};

export const RasterLayerRenderer: React.FC<RasterLayerRendererProps> = ({ parentId, layerId, mapZoom }) => {
  const map = useMap();
  const [leafletLayer, setLeafletLayer] = useState<L.Layer | null>(null);
  const [rasterData, setRasterData] = useState<RasterData | null>(null);
  const [colorScale, setColorScale] = useState<ColorScale | null>(null);
  const dataProcessorRef = useRef<DataProcessorService | null>(null);
  const colorGeneratorRef = useRef<ColorGeneratorService | null>(null);
  const currentOverviewRef = useRef<number | null>(null);
  const loadRef = useRef(0);

  const leafletLayerRef = useRef<L.Layer | null>(null);
  const activeLayerRef = useRef<L.Layer | null>(null);
  const pendingLayerRef = useRef<L.Layer | null>(null);
  const prevFilePathRef = useRef<string | undefined>(undefined);
  
  // Determine best overview index based on zoom level
  // Overviews: 0=8303x6233, 1=4152x3117, 2=2076x1559, 3=1038x780, 4=519x390, 5=260x195
  const getOverviewIndexForZoom = (zoom: number): number => {
    // Lower zoom = wider view = use lower resolution overview
    // Higher zoom = closer view = use higher resolution overview
    if (zoom <= 7) return 4; // 519x390 - very low zoom
    if (zoom <= 8) return 3; // 1038x780 - low zoom (initial zoom is 8)
    if (zoom <= 9) return 2; // 2076x1559 - medium zoom
    if (zoom <= 10) return 1; // 4152x3117 - high zoom
    return 0; // Full resolution for very high zoom
  };

  const rasterLayers = useRasterLayersStore(state => state.rasterLayers);
  const parentLayer = rasterLayers.find(r => r.id === parentId);
  const subLayer =
    layerId && parentLayer?.subLayers
      ? parentLayer.subLayers.find(sub => sub.id === layerId)
      : undefined;

  const activeLayer = subLayer ?? parentLayer;
  const isVisible = !!activeLayer?.visible;
  const filePath = activeLayer?.filePath;
  const opacity = activeLayer?.opacity ?? 0.7;

  // Initialize services
  useEffect(() => {
    if (!dataProcessorRef.current) {
      dataProcessorRef.current = new DataProcessorService();
    }
    if (!colorGeneratorRef.current) {
      colorGeneratorRef.current = new ColorGeneratorService();
    }
  }, []);

  useEffect(() => {
    if (!map) return;
  
    //let currentLayer: L.Layer | null = null;
    
    let isMounted = true;
  
    // const clearLayer = () => {
    //   if (currentLayer && map.hasLayer(currentLayer)) {
    //     map.removeLayer(currentLayer);
    //     currentLayer = null;
    //   }
    // };
    const clearLayer = () => {
      if (leafletLayerRef.current && map.hasLayer(leafletLayerRef.current)) 
      {
        map.removeLayer(leafletLayerRef.current);
        leafletLayerRef.current = null;
      }
    }

    const clearAllLayers = () => {
      [activeLayerRef.current, pendingLayerRef.current].forEach(layer => {
        if (layer && map.hasLayer(layer)) {
          map.removeLayer(layer);
        }
      });
      activeLayerRef.current = null;
      pendingLayerRef.current = null;
    }

    
    

  
    const loadRasterLayer = async () => {

      const loadId = ++loadRef.current;

      if (!isVisible || !filePath) {
        //clearLayer();
        //clearAllLayers();
        setRasterData(null);
        return;
      }
      
      const ext = filePath.split('.').pop()?.toLowerCase();
      const isZip = ext === 'zip';
      
      // Handle .tif/.tiff files or .zip files containing .tif files
      if (!["tif", "tiff", "geotiff", "zip"].includes(ext!)) {
        console.warn(`RasterLayerRenderer: Unsupported file type: ${ext}`);
        return;
      }

      try {
        const base = import.meta.env.BASE_URL || '';
        const fullPath = filePath.startsWith('http') || filePath.startsWith('/') 
          ? filePath 
          : `${base}${filePath}`;
        
        const response = await fetch(fullPath);
        if (!response.ok) {
          throw new Error(`Failed to load raster file: ${response.statusText}`);
        }
        
        let arrayBuffer: ArrayBuffer;
        
        if (isZip) {
          // Handle zipped file
          const blob = await response.blob();
          const zip = await JSZip.loadAsync(blob);
          
          // Find the first .tif/.tiff file in the zip
          const tifFile = Object.keys(zip.files).find(name => 
            /\.(tif|tiff|geotiff)$/i.test(name)
          );
          
          if (!tifFile) {
            throw new Error('No .tif file found in zip archive');
          }
          
          const tifBlob = await zip.file(tifFile)!.async('blob');
          arrayBuffer = await tifBlob.arrayBuffer();
          console.log(`Extracted TIFF from zip: ${tifFile}, size: ${arrayBuffer.byteLength}`);
        } else {
          // Handle direct .tif file
          arrayBuffer = await response.arrayBuffer();
          console.log("Raster TIFF size:", arrayBuffer.byteLength);
        }

        // Use DataProcessorService to process the GeoTIFF
        if (!dataProcessorRef.current) {
          throw new Error("DataProcessorService not initialized");
        }

        // Determine best overview and sampling for faster loading
        //const currentZoom = map.getZoom();
        const currentZoom = mapZoom;

        console.log(
          `[Raster ${parentId}${layerId ? `:${layerId}` : ""}] zoom =`,
          mapZoom
        )
        //const overviewIndex = getOverviewIndexForZoom(currentZoom);

        const overviewIndex = activeLayer?.overviewZoom
          ? getOverviewForZoom(mapZoom, activeLayer.overviewZoom)
          : getOverviewIndexForZoom(mapZoom);

        // if(currentOverviewRef.current === overviewIndex && currentLayer) {
        //   return;
        // }
        // if (currentOverviewRef.current === overviewIndex && leafletLayerRef.current) {
        //   return;
        // }
        if (
          currentOverviewRef.current === overviewIndex &&
          activeLayerRef.current
        ) {
          return;
        }
        
        currentOverviewRef.current = overviewIndex;

        // For very large files, use sampling to reduce memory usage
        // You can adjust sampleRate: 1 = no sampling, 2 = every 2nd pixel, 4 = every 4th pixel, etc.
        const fileSizeMB = arrayBuffer.byteLength / (1024 * 1024);
        let sampleRate = 1;
        
        // Adaptive sampling based on file size (less aggressive when using overviews)
        if (overviewIndex > 0) {
          // Using an overview, so we can use less sampling
          if (fileSizeMB > 200) {
            sampleRate = 2;
          } else if (fileSizeMB > 100) {
            sampleRate = 1; // No sampling needed for overviews
          }
        } else {
          // Full resolution - use more aggressive sampling
          if (fileSizeMB > 200) {
            sampleRate = 4; // Every 4th pixel for very large files (>200MB)
          } else if (fileSizeMB > 100) {
            sampleRate = 3; // Every 3rd pixel for large files (>100MB)
          } else if (fileSizeMB > 50) {
            sampleRate = 2; // Every 2nd pixel for medium-large files (>50MB)
          }
        }
        
        console.log(`Processing GeoTIFF: ${fileSizeMB.toFixed(2)}MB, overview: ${overviewIndex}, sample rate: ${sampleRate}`);
        
        const processedRaster = await dataProcessorRef.current.getRasterDataFromGeoTIFFArrayBuffer(
          arrayBuffer,
          undefined, // customNoData
          [0], // bands - just first band for now
          sampleRate,
          overviewIndex // Use overview for faster loading
        );

        console.log(
          `[Raster ${parentId}${layerId ? `:${layerId}` : ""}] overview =`,
          overviewIndex
        );

        
        if (!isMounted || !processedRaster || loadId !== loadRef.current) {
          return;
        }

        setRasterData(processedRaster);

        // Get the first band (or default to "0")
        const bands = processedRaster.getBands();
        const bandNames = Object.keys(bands);
        const firstBand = bandNames[0] || "0";
        const bandData = bands[firstBand];
        const header = processedRaster.getHeader();

        // Determine data range for color scale
        let minValue = Infinity;
        let maxValue = -Infinity;
        bandData.forEach((value) => {
          if (value !== undefined && value !== null && !isNaN(value)) {
            minValue = Math.min(minValue, value);
            maxValue = Math.max(maxValue, value);
          }
        });

        // Create color scale using ColorGeneratorService
        if (!colorGeneratorRef.current) {
          throw new Error("ColorGeneratorService not initialized");
        }

        // Use monochromatic scale by default, but you can change this
        const scale = colorGeneratorRef.current.getDefaultMonochromaticRainfallColorScale(
          [minValue, maxValue],
          false
        );
        setColorScale(scale);


        //clearLayer();
        //clearAllLayers();

        // Create raster layer using custom Leaflet extension
        const rasterOptions: RasterOptions = {
          cacheEmpty: true,
          colorScale: scale,
          data: {
            header: header,
            values: bandData
          }
        };

        // Ensure raster layer is initialized
        initializeRasterLayer();
        const rasterLayer = (R as any).gridLayer.RasterLayer(rasterOptions);
        rasterLayer.setOpacity(opacity);
        rasterLayer.addTo(map);
        pendingLayerRef.current = rasterLayer;
        
        // //currentLayer = rasterLayer;
        // leafletLayerRef.current = rasterLayer;
        // setLeafletLayer(rasterLayer);

        // does this go here?
        if ((rasterLayer as any).once) {
          rasterLayer.once("load", () => {
            if (activeLayerRef.current && map.hasLayer(activeLayerRef.current)) {
              map.removeLayer(activeLayerRef.current);
            }
        
            activeLayerRef.current = rasterLayer;
            pendingLayerRef.current = null;
            setLeafletLayer(rasterLayer);
          });
        } else {
          // fallback: data already loaded synchronously
          if (activeLayerRef.current && map.hasLayer(activeLayerRef.current)) {
            map.removeLayer(activeLayerRef.current);
          }
        
          activeLayerRef.current = rasterLayer;
          pendingLayerRef.current = null;
          setLeafletLayer(rasterLayer);
        }
        prevFilePathRef.current = filePath;
        // end

      } catch (err) {
        console.error('Error loading raster layer:', err);
      }
    };
    // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // const onZoomEnd = () => {
    //   loadRasterLayer();
    // };

    // map.on("zoomend", onZoomEnd);
    
    // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------
    // ------------------------------------------------------------------------------------------------------------------------------------------------------------------------
        
    loadRasterLayer();
  
    return () => {
      isMounted = false;
    
      // Only destroy layers if the raster itself changed or was hidden
      if (
        prevFilePathRef.current &&
        (prevFilePathRef.current !== filePath || !isVisible)
      ) {
        clearAllLayers();
        clearLayer();
      }
    
      prevFilePathRef.current = filePath;
    };

  }, [map, filePath, isVisible, opacity, mapZoom]);

  // Update opacity when it changes
  useEffect(() => {
    if (leafletLayer && opacity !== undefined) {
      (leafletLayer as any).setOpacity(opacity);
    }
  }, [leafletLayer, opacity]);

  // Update color scale when raster data changes
  useEffect(() => {
    if (leafletLayer && colorScale && rasterData) {
      (leafletLayer as any).setColorScale(colorScale);
    }
  }, [leafletLayer, colorScale, rasterData]);

  return null;
};
