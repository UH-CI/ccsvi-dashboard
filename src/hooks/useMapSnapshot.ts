import { useCallback, useRef } from 'react';
import { Map as LeafletMap } from 'leaflet';
import { takeMapSnapshot, SnapshotOptions } from '../utils/snapshotUtils';

export interface UseMapSnapshotReturn {
  mapRef: React.RefObject<LeafletMap | null>;
  takeSnapshot: (options?: SnapshotOptions) => Promise<void>;
  isSnapshotAvailable: boolean;
}

/**
 * Custom hook for managing map snapshots
 * Provides a map reference and snapshot functionality
 */
export const useMapSnapshot = (): UseMapSnapshotReturn => {
  const mapRef = useRef<LeafletMap | null>(null);

  const takeSnapshot = useCallback(async (options: SnapshotOptions = {}) => {
    if (!mapRef.current) {
      throw new Error('Map reference not available');
    }

    const mapContainer = mapRef.current.getContainer();
    await takeMapSnapshot(mapContainer, options);
  }, []);

  const isSnapshotAvailable = mapRef.current !== null;

  return {
    mapRef,
    takeSnapshot,
    isSnapshotAvailable
  };
};