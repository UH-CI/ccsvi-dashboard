import React from 'react';
import { GenericHazardLayer } from './GenericHazardLayer';
import { SubHazardLayer } from './SubHazardLayer';
import { HazardLayerWithSubs } from '../../hooks/useHazardLayers';
import { useDataFetcher } from '../../hooks/useDataFetcher';
import { FeatureCollection, Geometry } from 'geojson';

interface Props {
    layer: HazardLayerWithSubs;
}

export const HazardLayerRenderer: React.FC<Props> = ({ layer }) => {
    try {
        // Load GeoJSON data for parent layer if visible and has filePath
        const parentLayerData = useDataFetcher<FeatureCollection<Geometry>>(
            layer.visible && layer.filePath ? `./${layer.filePath}` : null,
            { 
                errorPrefix: `Failed to load hazard layer: ${layer.name}`,
                skipIfLoaded: false // Always reload when visibility changes
            }
        );

        // Get visible sub-layers with file paths
        const visibleSubLayers = layer.subLayers.filter(sub => sub.visible && sub.filePath);

        return (
            <>
                {/* Render parent layer if visible and data is loaded */}
                {layer.visible && parentLayerData.data && (
                    <GenericHazardLayer 
                        layer={{
                            ...layer,
                            data: parentLayerData.data
                        }} 
                    />
                )}
                
                {/* Render sub-layers */}
                {visibleSubLayers.map(subLayer => (
                    <SubHazardLayerWrapper 
                        key={subLayer.id} 
                        subLayer={subLayer} 
                        parentColor={layer.color}
                    />
                ))}
            </>
        );
    } catch (error) {
        console.error('Error in HazardLayerRenderer:', error);
        return null;
    }
};

// Separate component to handle individual sub-layer data loading
interface SubHazardLayerWrapperProps {
    subLayer: HazardLayerWithSubs['subLayers'][0];
    parentColor?: string;
}

const SubHazardLayerWrapper: React.FC<SubHazardLayerWrapperProps> = ({ subLayer, parentColor }) => {
    try {
        const subLayerData = useDataFetcher<FeatureCollection<Geometry>>(
            `./${subLayer.filePath!}`,
            { 
                errorPrefix: `Failed to load sub-hazard layer: ${subLayer.name}`,
                skipIfLoaded: false // Always reload when visibility changes
            }
        );

        if (!subLayerData.data) return null;

        return (
            <SubHazardLayer
                layer={{
                    ...subLayer,
                    data: subLayerData.data
                }}
                color={parentColor}
            />
        );
    } catch (error) {
        console.error('Error in SubHazardLayerWrapper:', error);
        return null;
    }
};
