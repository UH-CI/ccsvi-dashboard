import React, { useMemo } from 'react';
import { SingleMapView } from '../SingleMapView';
import { MultiMapControlPanel } from '../ControlPanel';
import { PointLayerConfig } from '../../types';
import { useUrlState } from '../../hooks/useUrlState';
import { useAppStore } from '../../stores';
import { useMapStore, useVisibleMaps } from '../../stores';
import styles from './MultiMapContainer.module.scss';


interface MultiMapContainerProps {
    maxMaps?: number;
    pointLayers: PointLayerConfig[];
    togglePointLayer: (id: string) => void;
}

export const MultiMapContainer: React.FC<MultiMapContainerProps> = ({ 
    maxMaps = 4,
    pointLayers,
    togglePointLayer,
}) => {
    const { blockGroupData } = useAppStore();

    const {
        mapConfigs,
        addMap,
        removeMap,
        updateMapConfig,
        toggleMapVisibility
    } = useMapStore();

    // use Vivible Maps from mapStore
    const visibleMaps = useVisibleMaps();

    // URL state management
    const { urlState, updateUrlState } = useUrlState();

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
                                mapId={config.id}
                                isPrimary={index === 0}
                                mapConfigsLength={visibleMaps.length}
                                pointLayers={pointLayers}
                                // Handlers
                                // onUpdateActiveFeature={(activeFeature) =>
                                //     updateMapActiveFeature(config.id, activeFeature)
                                // }
                            />
                        </div>
                    ))}
                </div>

                <MultiMapControlPanel
                    dataset={blockGroupData}
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
