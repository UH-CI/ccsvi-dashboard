import React, { useState, useCallback, useMemo } from "react";
import { SingleMapView } from "../SingleMapView";
import { MultiMapControlPanel } from "../ControlPanel";
import { MapConfig, MetricsData, Dataset, PointLayerConfig } from "../../types";
import { FeatureCollection } from "geojson";
import { useUrlState } from "../../hooks/useUrlState";
import styles from "./MultiMapContainer.module.scss";

interface MultiMapContainerProps {
  maxMaps?: number;
  dataset: Dataset | null;
  metricsData: MetricsData | null;
  polygonLayers?: {
    [key: string]: FeatureCollection | null;
  };
  pointLayers: PointLayerConfig[];
  togglePointLayer: (id: string) => void;

  mapRef?: React.RefObject<any>;
  onTakeSnapshot?: (mapContainer: HTMLElement, mapId: string) => void;
}

export const MultiMapContainer: React.FC<MultiMapContainerProps> = ({
  maxMaps = 4,
  dataset,
  metricsData,
  polygonLayers,
  pointLayers,
  togglePointLayer,
  onTakeSnapshot,
}) => {
  // URL state management
  const { urlState, updateUrlState } = useUrlState();

  // Local state for map configurations - initialize with empty values
  const [mapConfigs, setMapConfigs] = useState<MapConfig[]>([
    {
      id: "map1",
      title: "Map 1",
      dataset: "",
      metric: "",
      visible: true,
    },
  ]);

  const handleMapSnapshot = useCallback(
    (container: HTMLElement, mapId: string) => {
      if (onTakeSnapshot) onTakeSnapshot(container, mapId);
    },
    [onTakeSnapshot]
  );

  // Add new map with empty values
  const addMap = useCallback(() => {
    if (mapConfigs.length < maxMaps) {
      const newMapId = `map${mapConfigs.length + 1}`;
      setMapConfigs((prev) => [
        ...prev,
        {
          id: newMapId,
          title: `Map ${mapConfigs.length + 1}`,
          dataset: "",
          metric: "",
          visible: true,
        },
      ]);
    }
  }, [mapConfigs.length, maxMaps]);

  const removeMap = useCallback(
    (mapId: string) => {
      if (mapConfigs.length > 1) {
        setMapConfigs((prev) => prev.filter((config) => config.id !== mapId));
      }
    },
    [mapConfigs.length]
  );

  // Update map configuration with memoization
  const updateMapConfig = useCallback(
    (mapId: string, updates: Partial<MapConfig>) => {
      setMapConfigs((prev) => {
        const newConfigs = prev.map((config) =>
          config.id === mapId ? { ...config, ...updates } : config
        );
        // Only update if there's actually a change
        const hasChanged = newConfigs.some(
          (config, index) =>
            config !== prev[index] ||
            JSON.stringify(config) !== JSON.stringify(prev[index])
        );
        return hasChanged ? newConfigs : prev;
      });
    },
    []
  );

  const toggleMapVisibility = useCallback((mapId: string) => {
    setMapConfigs((prev) =>
      prev.map((config) =>
        config.id === mapId ? { ...config, visible: !config.visible } : config
      )
    );
  }, []);

  // Update active feature for a specific map
  const updateMapActiveFeature = useCallback(
    (mapId: string, activeFeature: MapConfig["activeFeature"]) => {
      setMapConfigs((prev) =>
        prev.map((config) =>
          config.id === mapId ? { ...config, activeFeature } : config
        )
      );
    },
    []
  );

  const visibleMaps = useMemo(
    () => mapConfigs.filter((config) => config.visible),
    [mapConfigs]
  );

  const gridLayout = useMemo(() => {
    const count = visibleMaps.length;

    if (count === 1) return { rows: 1, cols: 1 };
    if (count === 2) return { rows: 1, cols: 2 };
    if (count === 3) return { rows: 2, cols: 2 };
    if (count === 4) return { rows: 2, cols: 2 };

    return { rows: 1, cols: 1 };
  }, [visibleMaps]);

  return (
    <div className={styles["multi-map-container"]}>
      <div className={styles["maps-layout"]}>
        <div
          className={styles["maps-grid"]}
          style={{
            gridTemplateRows: `repeat(${gridLayout.rows}, 1fr)`,
            gridTemplateColumns: `repeat(${gridLayout.cols}, 1fr)`,
          }}
        >
          {visibleMaps.map((config, index) => (
            <div key={config.id} className={styles["map-wrapper"]}>
              <SingleMapView
                config={config}
                isPrimary={index === 0}
                mapConfigsLength={visibleMaps.length}
                // Pass shared data - NO LOADING IN SINGLEMAPVIEW
                dataset={dataset}
                metricsData={metricsData}
                polygonLayers={{
                  censusBlockGroups: polygonLayers?.censusBlockGroups || null,
                  hawaiianHomelands: polygonLayers?.hawaiianHomelands || null,
                  countyBoundaries: polygonLayers?.countyBoundaries || null,
                }}
                pointLayers={pointLayers}
                // mapRef={mapRef}
                onSnapshot={handleMapSnapshot}
                // Handlers
                onUpdateActiveFeature={(activeFeature) =>
                  updateMapActiveFeature(config.id, activeFeature)
                }
              />
            </div>
          ))}
        </div>

        <MultiMapControlPanel
          dataset={dataset}
          mapConfigs={mapConfigs}
          activeDataset={urlState.dataset}
          activeDatasetMetric={urlState.metric}
          onDatasetChange={(value) =>
            updateUrlState({ dataset: value, metric: "" })
          }
          onMetricChange={(value) => updateUrlState({ metric: value })}
          pointLayers={pointLayers}
          togglePointLayer={togglePointLayer}
          onAddMap={addMap}
          onRemoveMap={removeMap}
          onUpdateMapConfig={updateMapConfig}
          onToggleVisibility={toggleMapVisibility}
          maxMaps={maxMaps}
        />
      </div>
    </div>
  );
};
