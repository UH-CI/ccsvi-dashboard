import { useCallback, useRef } from 'react';
import { Map as LeafletMap } from 'leaflet';
import { takeMapSnapshot, SnapshotOptions } from '../utils/snapshotUtils';

export interface UseMapSnapshotReturn {
  mapRef: React.RefObject<LeafletMap | null>;
  takeSnapshot: (options?: SnapshotOptions, wrapperRef?: React.RefObject<HTMLElement | null>) => Promise<void>;
  isSnapshotAvailable: boolean;
}

/**
 * Custom hook for managing map snapshots using dom-to-image-more
 * Captures all layers including GeoJSON features and point markers
 */
export const useMapSnapshot = (): UseMapSnapshotReturn => {
  const mapRef = useRef<LeafletMap | null>(null);

  const takeSnapshot = useCallback(async (
      options: SnapshotOptions = {},
      wrapperRef?: React.RefObject<HTMLElement | null>
  ) => {
    if (!mapRef.current) {
      throw new Error('Map reference not available');
    }

    // Wait a moment for any pending map updates to complete
    await new Promise(resolve => setTimeout(resolve, 200));

    let targetElement: HTMLElement;

    if (wrapperRef?.current) {
      // Use the provided wrapper ref (includes legend)
      targetElement = wrapperRef.current;
    } else {
      // Fallback to just the map container
      targetElement = mapRef.current.getContainer();
    }

    await takeMapSnapshot(targetElement, options);
  }, []);

  const isSnapshotAvailable = mapRef.current !== null;

  return {
    mapRef,
    takeSnapshot,
    isSnapshotAvailable
  };
};