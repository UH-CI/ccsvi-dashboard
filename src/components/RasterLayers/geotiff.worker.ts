/// <reference lib="webworker" />

import * as geotiff from "geotiff";

// Export for Vite worker handling
export default null;

addEventListener("message", async ({ data }) => {
  let { buffer, customNoData, bands, id, sampleRate, overviewIndex } = data;
  try {
    let tiff: geotiff.GeoTIFF = await geotiff.fromArrayBuffer(buffer);
    
    // Select appropriate overview for faster loading
    // overviewIndex: 0 = full resolution, 1+ = overview levels
    // Always get the base image (index 0) first for affine transformation data
    const baseImage: geotiff.GeoTIFFImage = await tiff.getImage(0);
    let image: geotiff.GeoTIFFImage;
    
    if (overviewIndex !== undefined && overviewIndex >= 0 && overviewIndex > 0) {
      try {
        const imageCount = await tiff.getImageCount();
        const validIndex = Math.min(overviewIndex, imageCount - 1);
        image = await tiff.getImage(validIndex);
        console.log(`Using overview ${validIndex} of ${imageCount} (requested: ${overviewIndex})`);
      } catch (overviewError) {
        // Fallback to main image if overview selection fails
        console.warn(`Failed to get overview ${overviewIndex}, using main image:`, overviewError);
        image = baseImage;
      }
    } else {
      // Use base image (full resolution)
      image = baseImage;
    }
    
    let fileDirectory = image.getFileDirectory();

    const width = image.getWidth();
    const height = image.getHeight();
    const totalPixels = width * height;
    
    // Use sampling for very large files to reduce memory usage
    // sampleRate of 1 = no sampling, 2 = every 2nd pixel, etc.
    const useSampling = sampleRate && sampleRate > 1 && totalPixels > 10000000; // 10M pixels threshold
    const sample = useSampling ? sampleRate : 1;
    
    //get scales from file directory (handle overviews which may not have ModelPixelScale)
    let xScale: number, yScale: number;
    let xllCorner: number, yllCorner: number;
    
    // Try to get bounding box from baseImage (has affine transformation tags)
    // Overviews don't have affine tags, so we always use the base image for georeferencing
    let bbox: number[] | null = null;
    try {
      bbox = baseImage.getBoundingBox();
    } catch (bboxError) {
      // getBoundingBox() can throw if image doesn't have affine transformation
      console.warn("Could not get bounding box from base image, will try alternatives:", bboxError);
    }
    
    if (bbox && bbox.length >= 4) {
      // Use bounding box to calculate pixel scale and origin
      xScale = Math.abs(bbox[2] - bbox[0]) / width;
      yScale = Math.abs(bbox[3] - bbox[1]) / height;
      xllCorner = Math.min(bbox[0], bbox[2]); // Left edge
      yllCorner = Math.min(bbox[1], bbox[3]); // Bottom edge
    } else if (fileDirectory.ModelPixelScale && Array.isArray(fileDirectory.ModelPixelScale) && fileDirectory.ModelPixelScale.length >= 2) {
      // Fallback to ModelPixelScale if bounding box unavailable
      [xScale, yScale] = fileDirectory.ModelPixelScale;
      
      // Try to get origin from tiepoints - wrap in try-catch as it may throw
      let tiepoints: any[] | null = null;
      try {
        tiepoints = image.getTiePoints();
      } catch (tiepointError) {
        // getTiePoints() can throw if image doesn't have affine transformation
        console.warn("Could not get tiepoints from image, will try main image:", tiepointError);
      }
      
      if (tiepoints && tiepoints.length > 0) {
        const tiepoint = tiepoints[0];
        xllCorner = tiepoint.x;
        yllCorner = tiepoint.y - height * yScale;
      } else {
        // Last resort: try to get from main image
        try {
          const mainImage = await tiff.getImage(0);
          let mainBbox: number[] | null = null;
          try {
            mainBbox = mainImage.getBoundingBox();
          } catch (mainBboxError) {
            console.warn("Could not get bounding box from main image:", mainBboxError);
          }
          
          if (mainBbox && mainBbox.length >= 4) {
            xllCorner = Math.min(mainBbox[0], mainBbox[2]);
            yllCorner = Math.min(mainBbox[1], mainBbox[3]);
          } else {
            throw new Error("Cannot determine origin: no bounding box or tiepoints available");
          }
        } catch (error) {
          throw new Error("Cannot determine origin: no bounding box or tiepoints available");
        }
      }
    } else {
      // Try to get from main image
      try {
        const mainImage = await tiff.getImage(0);
        let mainBbox: number[] | null = null;
        try {
          mainBbox = mainImage.getBoundingBox();
        } catch (mainBboxError) {
          console.warn("Could not get bounding box from main image:", mainBboxError);
        }
        
        const mainFileDirectory = mainImage.getFileDirectory();
        
        if (mainBbox && mainBbox.length >= 4) {
          // Calculate scale from main image and adjust for overview
          const mainWidth = mainImage.getWidth();
          const scaleFactor = mainWidth / width;
          
          if (mainFileDirectory.ModelPixelScale && Array.isArray(mainFileDirectory.ModelPixelScale) && mainFileDirectory.ModelPixelScale.length >= 2) {
            const [mainXScale, mainYScale] = mainFileDirectory.ModelPixelScale;
            xScale = mainXScale * scaleFactor;
            yScale = mainYScale * scaleFactor;
          } else {
            xScale = Math.abs(mainBbox[2] - mainBbox[0]) / mainWidth * scaleFactor;
            yScale = Math.abs(mainBbox[3] - mainBbox[1]) / mainImage.getHeight() * scaleFactor;
          }
          
          xllCorner = Math.min(mainBbox[0], mainBbox[2]);
          yllCorner = Math.min(mainBbox[1], mainBbox[3]);
        } else {
          throw new Error("Cannot determine pixel scale and origin from image metadata");
        }
      } catch (fallbackError) {
        throw new Error(`Cannot determine pixel scale and origin: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
      }
    }
  
    //if unspecified or empty assume all bands
    if(bands == undefined || bands.length === 0) {
      bands = [0]; // Default to first band only for large files
    }
  
    let noData = Number.parseFloat(fileDirectory.GDAL_NODATA);
    if (isNaN(noData)) {
      noData = -9999; // Default no data value
    }
  
    let header = {
      nCols: width,
      nRows: height,
      xllCorner: xllCorner,
      yllCorner: yllCorner,
      cellXSize: xScale,
      cellYSize: yScale,
    }
    
    let bandData: Record<number, [number, number][]> = {};
    
    // Maximum number of values to store per band (to avoid Map size limits)
    // JavaScript Maps have a limit of ~16.7M entries, so we'll cap at 10M for safety
    const MAX_VALUES_PER_BAND = 10000000;

    // Read rasters in chunks/windows for large files to avoid memory issues
    const chunkSize = 1000; // Process 1000 rows at a time
    
    for(let bandIndex = 0; bandIndex < bands.length; bandIndex++) {
      let band = bands[bandIndex];
      let values: [number, number][] = [];
      
      // Read raster data with error handling for large files
      try {
        // For very large files, use windowed reading to avoid memory issues
        let raster: geotiff.TypedArray | undefined;
        
        if (totalPixels > 10000000) {
          // For files > 10M pixels, read in smaller windows
          const windowHeight = Math.min(2000, height); // Read 2000 rows at a time max
          
          for (let yStart = 0; yStart < height; yStart += windowHeight) {
            const yEnd = Math.min(yStart + windowHeight, height);
            const window = [0, yStart, width, yEnd] as [number, number, number, number];
            
            try {
              const windowRasters = await image.readRasters({ window, samples: [band] }) as geotiff.TypedArray[];
              const windowRaster = windowRasters[0];
              
              if (windowRaster) {
                const windowWidth = width;
                const windowLength = windowRaster.length;
                
                // Process window with sampling
                for (let j = 0; j < windowLength; j += sample) {
                  // Stop if we've reached the maximum number of values
                  if (values.length >= MAX_VALUES_PER_BAND) {
                    console.warn(`Reached maximum values limit (${MAX_VALUES_PER_BAND}) for band ${band}, stopping processing`);
                    break;
                  }
                  
                  const value = windowRaster[j];
                  if (value != noData && value != customNoData && !isNaN(value) && value !== null && value !== undefined) {
                    // Calculate global index
                    const localRow = Math.floor(j / windowWidth);
                    const localCol = j % windowWidth;
                    const globalIndex = (yStart + localRow) * width + localCol;
                    values.push([globalIndex, value]);
                  }
                }
                
                // Break outer loop if we've hit the limit
                if (values.length >= MAX_VALUES_PER_BAND) {
                  break;
                }
              }
            } catch (windowError) {
              console.warn(`Error reading window at y=${yStart}:`, windowError);
              // Continue with next window
            }
          }
        } else {
          // For smaller files, read all at once
          const rasters = (await image.readRasters({ samples: [band] })) as geotiff.TypedArray[];
          raster = rasters[0];
          
          if (raster == undefined) {
            throw new Error("Could not find band: " + band);
          }
          
          // Process with sampling if needed
          for (let j = 0; j < raster.length; j += sample) {
            // Stop if we've reached the maximum number of values
            if (values.length >= MAX_VALUES_PER_BAND) {
              console.warn(`Reached maximum values limit (${MAX_VALUES_PER_BAND}) for band ${band}, stopping processing`);
              break;
            }
            
            const value = raster[j];
            if (value != noData && value != customNoData && !isNaN(value) && value !== null && value !== undefined) {
              values.push([j, value]);
            }
          }
        }
      } catch (readError) {
        throw new Error(`Failed to read raster data: ${readError instanceof Error ? readError.message : String(readError)}`);
      }
      
      bandData[bandIndex] = values;
    }
    
    postMessage({
      id,
      header,
      bandData
    });
  }
  catch(e) {
    console.error(`Error processing geotiff: ${e}`);
    postMessage({
      id,
      header: null,
      bandData: null,
      error: e instanceof Error ? e.message : String(e)
    });
  }
});