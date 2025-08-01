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
 * Simple approach: Take a screenshot of the entire map container
 * This captures everything as the user sees it
 */
export const takeMapSnapshot = async (
    mapContainer: HTMLElement,
    options: SnapshotOptions = {}
): Promise<void> => {
  try {
    // Dynamic import to avoid blocking main thread during app initialization
    const html2canvas = (await import('html2canvas')).default;

    // Simple, reliable options that work well with Leaflet
    const canvas = await html2canvas(mapContainer, {
      useCORS: true,
      allowTaint: false,
      logging: false,
      height: mapContainer.offsetHeight,
      width: mapContainer.offsetWidth
    });

    // Convert canvas to blob
    const blob = await new Promise<Blob | null>((resolve) => {
      const mimeType = options.format === 'jpeg' ? 'image/jpeg' : 'image/png';
      canvas.toBlob(resolve, mimeType, options.quality);
    });

    if (!blob) {
      throw new Error('Failed to create image blob');
    }

    // Generate filename and download
    const filename = generateSnapshotFilename(options);
    downloadBlob(blob, filename);

    console.log('Snapshot saved as:', filename);
  } catch (error) {
    console.error('Error taking snapshot:', error);
    throw new Error('Failed to take snapshot. Please try again.');
  }
};