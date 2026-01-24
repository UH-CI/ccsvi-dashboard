import React, { useCallback } from "react";
import "./App.css";
import styles from "./App.module.scss";
import { MultiMapContainer } from "./components/MultiMapContainer";
import { TableViewer } from "./components/TableViewer";
import { useUrlState } from "./hooks/useUrlState";
import { usePointLayers } from "./hooks/usePointLayers";
import { useMapSnapshot } from "./hooks/useMapSnapshot.ts";
import { useDataFetcher } from "./hooks/useDataFetcher.ts";
import {
  MetricsData,
  Dataset,
  BlockGroupProperties,
  HawaiianHomelandProperties,
  CountyBoundariesProperties,
} from "./types";
import { FeatureCollection, Geometry } from "geojson";
import { DATASETS_CONFIG, POLYGON_LAYERS } from "./config";

const App: React.FC = () => {
  const { urlState, updateUrlState } = useUrlState();

  // Contains actual demographic metric values per geographic block group
  const metricsData = useDataFetcher<MetricsData>(
    DATASETS_CONFIG.censusDatasetsPath,
    { errorPrefix: "Failed to load metrics data" }
  );

  // Configuration metadata for census datasets
  const blockGroupData = useDataFetcher<Dataset>(
    DATASETS_CONFIG.censusDatasetsInfoPath,
    { errorPrefix: "Failed to load dataset metadata" }
  );

  const censusBlockGroups = useDataFetcher<
    FeatureCollection<Geometry, BlockGroupProperties>
  >(POLYGON_LAYERS.censusBlockGroups.path, {
    errorPrefix: "Failed to load census block group data",
  });

  const hawaiianHomelands = useDataFetcher<
    FeatureCollection<Geometry, HawaiianHomelandProperties>
  >(POLYGON_LAYERS.hawaiianHomelands.path, {
    errorPrefix: `Failed to fetch hawaiian homelands data`,
  });

  const countyBoundaries = useDataFetcher<
    FeatureCollection<Geometry, CountyBoundariesProperties>
  >(POLYGON_LAYERS.countyBoundaries.path, {
    errorPrefix: `Failed to fetch county boundaries data`,
  });

  const pointLayers = usePointLayers(urlState.pointLayers);

  // Snapshot system
  const { mapRef, takeSnapshot } = useMapSnapshot();
  const mapWrapperRef = React.useRef<HTMLDivElement | null>(null);

  const handleTakeSnapshot = useCallback(
    async (mapContainer: HTMLElement, mapId: string) => {
      console.log("Snapshot requested by map:", mapId);

      try {
        await takeSnapshot(
          {
            activeDataset: urlState.dataset,
            activeDatasetMetric: urlState.metric,
            customPrefix: `hawaii-census-${mapId}`,
            quality: 0.95,
          },
          mapContainer
        );
        console.log("Snapshot taken successfully");
      } catch (error) {
        alert(`Failed to take snapshot. Please try again. ${error}`);
      }
    },
    [takeSnapshot, urlState.dataset, urlState.metric]
  );

  // Check if all data is ready
  const isPolygonLayersLoaded =
    censusBlockGroups.data !== null &&
    hawaiianHomelands.data !== null &&
    countyBoundaries.data !== null;

  // Check if all data is ready
  const isReady =
    metricsData.loaded &&
    blockGroupData.loaded &&
    pointLayers.isInitialized &&
    isPolygonLayersLoaded;

  // Event handlers that update URL state
  const handlePointLayerToggle = (layerId: string) => {
    const currentVisible = urlState.pointLayers;
    const newVisible = currentVisible.includes(layerId)
      ? currentVisible.filter((id) => id !== layerId)
      : [...currentVisible, layerId];
    updateUrlState({ pointLayers: newVisible });
  };

  if (metricsData.error || blockGroupData.error) {
    return (
      <div className={styles["error-container"]}>
        <h2>Error loading data</h2>
        {metricsData.error && <p>{metricsData.error}</p>}
        {blockGroupData.error && <p>{blockGroupData.error}</p>}
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className={styles["loading-container"]}>
        <div>Loading data...</div>
      </div>
    );
  }

  const activeDatasetObject =
    blockGroupData.data && urlState.dataset
      ? blockGroupData.data[urlState.dataset]
      : null;

  return (
    <div className={styles["app-container"]}>
      <div className={styles["map-section"]}>
        <MultiMapContainer
          maxMaps={4}
          dataset={blockGroupData.data}
          metricsData={metricsData.data}
          polygonLayers={{
            censusBlockGroups: censusBlockGroups.data,
            hawaiianHomelands: hawaiianHomelands.data,
            countyBoundaries: countyBoundaries.data,
          }}
          pointLayers={pointLayers.pointLayers}
          togglePointLayer={handlePointLayerToggle}
          mapRef={mapRef}
          onTakeSnapshot={handleTakeSnapshot}
        />

        <TableViewer
          activeDataset={urlState.dataset}
          datasetInfo={activeDatasetObject}
        />
      </div>

      {/*<ControlPanel*/}
      {/*    dataset={dataset}*/}
      {/*    activeDataset={urlState.dataset}*/}
      {/*    activeDatasetMetric={urlState.metric}*/}
      {/*    onDatasetChange={handleDatasetChange}*/}
      {/*    onMetricChange={handleMetricChange}*/}
      {/*    pointLayers={pointLayers}*/}
      {/*    togglePointLayer={handlePointLayerToggle}*/}
      {/*    onTakeSnapshot={handleTakeSnapshot}*/}
      {/*/>*/}
    </div>
  );
};

export default App;
