import React, { useMemo } from 'react';
import { SingleMapView } from '../SingleMapView';
import { useVisibleMaps, useMapStore } from '../../stores';
import styles from './MultiMapContainer.module.scss';


interface MultiMapContainerProps {
    maxMaps?: number;
}

export const MultiMapContainer: React.FC<MultiMapContainerProps> = ({ 
    maxMaps = 4,
}) => {

    // Use visible maps from mapStore
    const visibleMaps = useVisibleMaps();
    const primaryMapId = useMapStore(state => state.primaryMapId);

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
                    {visibleMaps.map((config, index) => (
                        <div key={config.id} className={styles['map-wrapper']}>
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
};