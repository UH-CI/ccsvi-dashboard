import React, { useMemo, forwardRef } from "react";
import { SingleMapView } from "../SingleMapView";
import { useVisibleMaps, useMapStore } from "../../stores";
import styles from "./MultiMapContainer.module.scss";

interface MultiMapContainerProps {
  maxMaps?: number;
  isGridView?: boolean;
}

export const MultiMapContainer = forwardRef<HTMLDivElement, MultiMapContainerProps>(({
  maxMaps = 4,
  isGridView = true,
}, ref) => {
  // Use visible maps from mapStore
  const visibleMaps = useVisibleMaps();
  const primaryMapId = useMapStore((state) => state.primaryMapId);

  const gridLayout = useMemo(() => {
    const count = visibleMaps.length;

    if (!isGridView) {
      return { rows: 1, cols: count };
    }

    if (count === 1) return { rows: 1, cols: 1 };
    if (count === 2) return { rows: 1, cols: 2 };
    if (count === 3) return { rows: 2, cols: 2 };
    if (count === 4) return { rows: 2, cols: 2 };

    return { rows: 1, cols: 1 };
  }, [visibleMaps, isGridView]);

  const gridModifier = useMemo(() => {
    if (!isGridView) return styles["maps-grid--table-open"];
    return "";
  }, [isGridView]);

  return (
    <div ref={ref} className={styles["multi-map-container"]}>
      <div className={styles["maps-layout"]}>
        <div
          className={`${styles["maps-grid"]} ${gridModifier}`}
          style={{
            gridTemplateRows: `repeat(${gridLayout.rows}, 1fr)`,
            gridTemplateColumns: `repeat(${gridLayout.cols}, 1fr)`,
          }}
        >
          {visibleMaps.map((config, index) => (
            <div key={config.id} className={styles["map-wrapper"]}>
              <SingleMapView
                mapId={config.id}
                isPrimary={config.id === primaryMapId}
                mapConfigsLength={visibleMaps.length}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});
