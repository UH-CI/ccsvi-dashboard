import { useState, useEffect, useCallback } from 'react';
import { FeatureCollection, Point } from 'geojson';
import { PointLayerConfig } from "../types";

export const usePointLayers = (visibleLayerIds: string[] = []) => {
    const [pointLayers, setPointLayers] = useState<PointLayerConfig[]>([]);
    const [isLoaded, setIsLoaded] = useState(false);

    const loadPointLayersConfig = useCallback(async () => {
        try {
            const response = await fetch(`${import.meta.env.BASE_URL}data/point_data/point_layers.json`);
            const config = await response.json();
            return config.pointLayers;
        } catch (err) {
            console.error('Error loading point layers configuration:', err);
            return [];
        }
    }, []);

    const loadPointData = useCallback(async (layer: PointLayerConfig): Promise<FeatureCollection<Point> | null> => {
        try {
            const url = `${import.meta.env.BASE_URL}${layer.filePath}`;
            const response = await fetch(url);
            return await response.json();
        } catch (err) {
            console.error(`Error loading ${layer.name} data:`, err);
            return null;
        }
    }, []);

    // Load point layers config once
    useEffect(() => {
        if (!isLoaded) {
            // console.log('Loading point layers config...');
            loadPointLayersConfig().then(layers => {
                const layersWithVisibility = layers.map((layer: PointLayerConfig) => ({
                    ...layer,
                    visible: visibleLayerIds.includes(layer.id)
                }));

                // console.log('Point layers loaded with initial visibility:', {
                //     visibleFromUrl: visibleLayerIds,
                //     layersLoaded: layersWithVisibility.map((l: PointLayerConfig) => ({ id: l.id, visible: l.visible }))
                // });

                setPointLayers(layersWithVisibility);
                setIsLoaded(true);
            });
        }
    }, [isLoaded, loadPointLayersConfig, visibleLayerIds]);

    // Update visibility when URL changes (after layers are loaded)
    useEffect(() => {
        if (isLoaded && pointLayers.length > 0) {
            // Check if visibility actually needs to change to prevent infinite loops
            const needsUpdate = pointLayers.some(layer =>
                layer.visible !== visibleLayerIds.includes(layer.id)
            );

            if (needsUpdate) {
                // console.log('Updating layer visibility from URL change:', {
                //     current: pointLayers.map(l => ({ id: l.id, visible: l.visible })),
                //     newVisible: visibleLayerIds
                // });

                setPointLayers(prev =>
                    prev.map(layer => ({
                        ...layer,
                        visible: visibleLayerIds.includes(layer.id)
                    }))
                );
            }
        }
    }, [visibleLayerIds, isLoaded]);

    // Load data for visible layers
    useEffect(() => {
        const loadVisibleLayers = async () => {
            const visibleLayers = pointLayers.filter(layer => layer.visible && !layer.data);

            if (visibleLayers.length === 0) return;

            // console.log('Loading data for visible layers:', visibleLayers.map(l => l.id));

            // Load all visible layers in parallel
            const loadPromises = visibleLayers.map(async (layer) => {
                const layerData = await loadPointData(layer);
                if (layerData) {
                    setPointLayers(prev =>
                        prev.map(l =>
                            l.id === layer.id
                                ? { ...l, data: layerData }
                                : l
                        )
                    );
                }
            });

            await Promise.all(loadPromises);
        };

        if (pointLayers.some(layer => layer.visible && !layer.data)) {
            loadVisibleLayers();
        }
    }, [pointLayers, loadPointData]);

    // Return current visible layer IDs for external use
    const getCurrentVisibleLayerIds = useCallback(() => {
        return pointLayers.filter(layer => layer.visible).map(layer => layer.id);
    }, [pointLayers]);

    return {
        pointLayers,
        getCurrentVisibleLayerIds,
        isInitialized: isLoaded && pointLayers.length > 0
    };
};