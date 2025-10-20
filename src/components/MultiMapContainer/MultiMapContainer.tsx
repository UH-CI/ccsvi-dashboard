import React, { useMemo } from 'react';
import { SingleMapView } from '../SingleMapView';
import { useVisibleMaps } from '../../stores';
import { MultiMapControlPanel } from '../ControlPanel';
import { MapConfig, MetricsData, Dataset, PointLayerConfig } from '../../types';
import { HazardLayerWithSubs } from '../../hooks/useHazardLayers';
import { FeatureCollection } from "geojson";
import { useUrlState } from '../../hooks/useUrlState';
import styles from './MultiMapContainer.module.scss';


interface MultiMapContainerProps {
    maxMaps?: number;
    hazardLayers?: HazardLayerWithSubs[];
    toggleHazardLayer?: (id: string, isParent?: boolean) => void;
}

export const MultiMapContainer: React.FC<MultiMapContainerProps> = ({ 
    maxMaps = 4,
    hazardLayers = [],
    toggleHazardLayer,
}) => {

    // Use visible maps from mapStore
    const visibleMaps = useVisibleMaps();

    // URL state management
    // const { urlState, updateUrlState } = useUrlState();

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
                    {visibleMaps.map((config: any, index: number) => (
                        <div key={config.id} className={styles['map-wrapper']}>
                            <SingleMapView
                                mapId={config.id}
                                isPrimary={index === 0}
                                mapConfigsLength={visibleMaps.length}
                                // Pass shared data - NO LOADING IN SINGLEMAPVIEW
                                dataset={dataset}
                                metricsData={metricsData}
                                polygonLayers={{
                                    censusBlockGroups: polygonLayers?.censusBlockGroups || null,
                                    hawaiianHomelands: polygonLayers?.hawaiianHomelands || null
                                }}
                                pointLayers={pointLayers}
                                hazardLayers={hazardLayers}
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
                    hazardLayers={hazardLayers}
                    toggleHazardLayer={toggleHazardLayer}
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
