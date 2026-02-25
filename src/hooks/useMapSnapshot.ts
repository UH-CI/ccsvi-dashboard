import { useCallback, useRef } from "react";
import { Map as LeafletMap } from "leaflet";
import { takeMapSnapshot, SnapshotOptions } from "../utils/snapshotUtils";

export interface UseMapSnapshotReturn {
  mapRef: React.RefObject<LeafletMap | null>;
  takeSnapshot: (
    options?: SnapshotOptions,
    wrapper?: React.RefObject<HTMLElement | null> | HTMLElement | null,
  ) => Promise<void>;
  isSnapshotAvailable: boolean;
}

/**
 * Custom hook for managing map snapshots using dom-to-image-more
 * Captures all layers including GeoJSON features and point markers
 */
export const useMapSnapshot = (): UseMapSnapshotReturn => {
  const mapRef = useRef<LeafletMap | null>(null);

  const takeSnapshot = useCallback(
    async (
      options: SnapshotOptions = {},
      wrapper?: React.RefObject<HTMLElement | null> | HTMLElement | null,
    ) => {
      await new Promise((resolve) => setTimeout(resolve, 200));

      let targetElement: HTMLElement;

      if (wrapper instanceof HTMLElement) {
        targetElement = wrapper;
      } else if (wrapper && wrapper.current instanceof HTMLElement) {
        targetElement = wrapper.current;
      } else if (mapRef.current) {
        targetElement = mapRef.current.getContainer();
      } else {
        throw new Error("Snapshot failed: no valid map container.");
      }

      await takeMapSnapshot(targetElement, options);
    },
    [],
  );

  const isSnapshotAvailable = mapRef.current !== null;

  return {
    mapRef,
    takeSnapshot,
    isSnapshotAvailable,
  };
};
