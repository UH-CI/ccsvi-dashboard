import { useMemo } from 'react';
import { BlockGroupProperties, HawaiianHomelandProperties, Dataset } from '../types';
import { polygonLayerConfigs } from '../config';
import { usePolygonLayer } from './usePolygonLayer';

export const useMapPolygonLayers = (dataset: Dataset | null, activeDataset: string | undefined) => {
  // Determine which layer to load based on the active dataset
  const shouldLoadHawaiianHomelands = useMemo(() => {
    if (!dataset || !activeDataset) return false;
    return dataset[activeDataset]?.hawaiianHomelands || false;
  }, [dataset, activeDataset]);

  // Use centralized polygon layer configurations
  const censusConfig = polygonLayerConfigs.census;
  const homelandsConfig = polygonLayerConfigs.hawaiianHomelands;

  // DEPRECATED
  // // Only load the appropriate layer based on dataset configuration
  // const censusLayer = usePolygonLayer<BlockGroupProperties>(
  //   shouldLoadHawaiianHomelands ? { ...censusConfig, enabled: false } : censusConfig
  // );
  // Load both layers for non-homelands gray out
  const censusLayer = usePolygonLayer<BlockGroupProperties>(censusConfig);
  const homelandsLayer = usePolygonLayer<HawaiianHomelandProperties>(
    shouldLoadHawaiianHomelands ? homelandsConfig : { ...homelandsConfig, enabled: false }
  );

  return {
    // DEPRECATED
    // geoData: shouldLoadHawaiianHomelands ? null : censusLayer.data,
    geoData: censusLayer.data,
    homelandsData: shouldLoadHawaiianHomelands ? homelandsLayer.data : null,
    censusLoading: censusLayer.loading,
    homelandsLoading: homelandsLayer.loading,
    censusError: censusLayer.error,
    homelandsError: homelandsLayer.error,
    // DEPRECATED
    // isDataLoaded: shouldLoadHawaiianHomelands ? homelandsLayer.data !== null : censusLayer.data !== null,
    // Data loaded state depends on whether we need both layers or just census
    isDataLoaded: shouldLoadHawaiianHomelands 
    ? (censusLayer.data !== null && homelandsLayer.data !== null)
    : censusLayer.data !== null,
    
  };
};
