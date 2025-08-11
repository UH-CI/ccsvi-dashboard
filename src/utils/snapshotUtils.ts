export interface SnapshotOptions {
  activeDataset?: string;
  activeDatasetMetric?: string;
  customPrefix?: string;
  format?: 'png' | 'jpeg';
  quality?: number;
}

/**
 * Generates a descriptive filename for the snapshot based on current map state
 */
export const generateSnapshotFilename = (options: SnapshotOptions = {}): string => {
  const {
    activeDataset,
    activeDatasetMetric,
    customPrefix = 'census-map',
    format = 'png'
  } = options;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const datasetName = activeDataset ? activeDataset.replace(/_/g, '-') : 'map';
  const metricName = activeDatasetMetric ? activeDatasetMetric.replace(/_/g, '-') : '';

  const parts = [customPrefix, datasetName];
  if (metricName) {
    parts.push(metricName);
  }
  parts.push(timestamp);

  return `${parts.join('-')}.${format}`;
};

/**
 * Downloads a blob as a file with the specified filename
 */
export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;

  // Temporarily add to DOM to trigger download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the object URL
  URL.revokeObjectURL(url);
};

/**
 * Wait for all map elements to be fully loaded
 */
const waitForMapElements = (mapContainer: HTMLElement): Promise<void> => {
  return new Promise((resolve) => {
    // Wait for tiles
    const tiles = mapContainer.querySelectorAll('.leaflet-tile');
    const images = mapContainer.querySelectorAll('img');

    let loadingCount = 0;
    const checkComplete = () => {
      loadingCount--;
      if (loadingCount <= 0) {
        // Add delay for final rendering
        setTimeout(resolve, 300);
      }
    };

    // Check tiles
    tiles.forEach((tile) => {
      const img = tile as HTMLImageElement;
      if (!img.complete && img.src) {
        loadingCount++;
        img.addEventListener('load', checkComplete, { once: true });
        img.addEventListener('error', checkComplete, { once: true });
      }
    });

    // Check other images
    images.forEach((img) => {
      if (!img.complete && img.src && !img.src.includes('data:')) {
        loadingCount++;
        img.addEventListener('load', checkComplete, { once: true });
        img.addEventListener('error', checkComplete, { once: true });
      }
    });

    if (loadingCount === 0) {
      setTimeout(resolve, 300);
    }
  });
};

/**
 * Take a map snapshot using dom-to-image-more
 * Captures all layers including GeoJSON features and point markers
 */
export const takeMapSnapshot = async (
    mapContainer: HTMLElement,
    options: SnapshotOptions = {}
): Promise<void> => {
  try {
    // Wait for all elements to load
    await waitForMapElements(mapContainer);

    // Dynamic import
    const domtoimage = (await import('dom-to-image-more')).default;

    const format = options.format || 'png';
    const quality = options.quality || 0.9;

    let dataUrl: string;

    if (format === 'jpeg') {
      dataUrl = await domtoimage.toJpeg(mapContainer, {
        quality,
        bgcolor: '#ffffff',
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        },
        filter: (node: HTMLElement) => {
          // Include all nodes but exclude some problematic elements
          if (node.classList) {
            // Exclude attribution and zoom controls if they cause issues
            return !node.classList.contains('leaflet-control-attribution') &&
                !node.classList.contains('leaflet-bar');
          }
          return true;
        }
      });
    } else {
      dataUrl = await domtoimage.toPng(mapContainer, {
        bgcolor: '#ffffff',
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        },
        filter: (node: HTMLElement) => {
          // Include all nodes but exclude some problematic elements
          if (node.classList) {
            // Keep all map layers, just exclude controls that might cause issues
            return !node.classList.contains('leaflet-control-attribution') &&
                !node.classList.contains('leaflet-bar');
          }
          return true;
        }
      });
    }

    // Convert data URL to blob
    const response = await fetch(dataUrl);
    const blob = await response.blob();

    if (!blob) {
      throw new Error('Failed to create image blob');
    }

    const filename = generateSnapshotFilename(options);
    downloadBlob(blob, filename);

  } catch (error) {
    throw new Error(`Failed to take snapshot: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};