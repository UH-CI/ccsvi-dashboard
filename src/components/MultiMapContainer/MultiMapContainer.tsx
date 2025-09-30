import React, { useState, useCallback, useMemo } from 'react';
import { SingleMapView } from '../SingleMapView';
import { MultiMapControlPanel } from '../ControlPanel';
import { MapConfig, MetricsData, Dataset, PointLayerConfig, BlockGroupProperties, HawaiianHomelandProperties } from '../../types';
import { FeatureCollection, Geometry } from "geojson";
// import { useBlockGroupLayer } from '../../hooks/useBlockGroupLayer';
import { useUrlState } from '../../hooks/useUrlState';
import styles from './MultiMapContainer.module.scss';


interface MultiMapContainerProps {
    maxMaps?: number;
    dataset: Dataset | null;
    metricsData: MetricsData | null;
    censusBlockPolygons: FeatureCollection<Geometry, BlockGroupProperties> | null;
    hawaiianHomelandPolygons: FeatureCollection<Geometry, HawaiianHomelandProperties> | null;
    pointLayers: PointLayerConfig[];
    togglePointLayer: (id: string) => void;
}

export const MultiMapContainer: React.FC<MultiMapContainerProps> = ({ 
    maxMaps = 4,
    dataset,
    metricsData,
    censusBlockPolygons,
    hawaiianHomelandPolygons,
    pointLayers,
    togglePointLayer,
}) => {
    // URL state management
    const { urlState, updateUrlState } = useUrlState();
    
    // Local state for map configurations - initialize with empty values
    const [mapConfigs, setMapConfigs] = useState<MapConfig[]>([
        {
            id: 'map1',
            title: 'Map 1',
            dataset: '',
            metric: '',
            visible: true
        }
    ]);

    // // Data loading
    // const { dataset: globalDataset, metricsData, loading, error, isInitialDataLoaded } = useBlockGroupLayer();

    // Add new map with empty values
    const addMap = useCallback(() => {
        if (mapConfigs.length < maxMaps) {
            const newMapId = `map${mapConfigs.length + 1}`;
            setMapConfigs(prev => [...prev, {
                id: newMapId,
                title: `Map ${mapConfigs.length + 1}`,
                dataset: '',
                metric: '',
                visible: true
            }]);
        }
    }, [mapConfigs.length, maxMaps]);

    const removeMap = useCallback((mapId: string) => {
        if (mapConfigs.length > 1) {
            setMapConfigs(prev => prev.filter(config => config.id !== mapId));
        }
    }, [mapConfigs.length]);

    // Update map configuration with memoization
    const updateMapConfig = useCallback((mapId: string, updates: Partial<MapConfig>) => {
        setMapConfigs(prev => {
            const newConfigs = prev.map(config => 
                config.id === mapId ? { ...config, ...updates } : config
            );
            // Only update if there's actually a change
            const hasChanged = newConfigs.some((config, index) => 
                config !== prev[index] || 
                JSON.stringify(config) !== JSON.stringify(prev[index])
            );
            return hasChanged ? newConfigs : prev;
        });
    }, []);

    const toggleMapVisibility = useCallback((mapId: string) => {
        setMapConfigs(prev => prev.map(config => 
            config.id === mapId ? { ...config, visible: !config.visible } : config
        ));
    }, []);

    // Update active feature for a specific map
    const updateMapActiveFeature = useCallback((mapId: string, activeFeature: MapConfig['activeFeature']) => {
        setMapConfigs(prev => prev.map(config => 
            config.id === mapId ? { ...config, activeFeature } : config
        ));
    }, []);

    // // Error handling
    // if (error) {
    //     return (
    //         <div className={styles['error-container']}>
    //             <h2>Error loading data</h2>
    //             <p>{error}</p>
    //             <button onClick={() => window.location.reload()}>
    //                 Retry
    //             </button>
    //         </div>
    //     );
    // }
    //
    // if (loading || !isInitialDataLoaded) {
    //     return (
    //         <div className={styles['loading-container']}>
    //             <div>Loading data...</div>
    //         </div>
    //     );
    // }

    const visibleMaps = useMemo(() =>
            mapConfigs.filter(config => config.visible),
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
        <div className={styles['multi-map-container']}>
            <div className={styles['maps-layout']}>
                <div 
                    className={styles['maps-grid']}
                    style={{
                        gridTemplateRows: `repeat(${gridLayout.rows}, 1fr)`,
                        gridTemplateColumns: `repeat(${gridLayout.cols}, 1fr)`
                    }}
                >
                    {visibleMaps.map((config, index) => (
                        <div key={config.id} className={styles['map-wrapper']}>
                            <SingleMapView
                                config={config}
                                isPrimary={index === 0}
                                mapConfigsLength={visibleMaps.length}
                                // Pass shared data - NO LOADING IN SINGLEMAPVIEW
                                dataset={dataset}
                                metricsData={metricsData}
                                censusBlockPolygons={censusBlockPolygons}
                                hawaiianHomelandPolygons={hawaiianHomelandPolygons}
                                pointLayers={pointLayers}
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
                    onDatasetChange={(value) => updateUrlState({ dataset: value, metric: '' })}
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
