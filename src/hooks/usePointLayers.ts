import { useState, useEffect, useMemo, useCallback } from 'react';
import { FeatureCollection, Point } from 'geojson';
import { PointLayerConfig } from "../types";

export const usePointLayers = () => {
    const [pointLayers, setPointLayers] = useState<PointLayerConfig[]>([]);

    const loadPointLayersConfig = useCallback(async () => {
        try {
            const response = await fetch(`${import.meta.env.BASE_URL}data/point_data/point_layers.json`);
            const config = await response.json();
            setPointLayers(config.pointLayers);
        } catch (err) {
            console.error('Error loading point layers configuration:', err);
        }
    }, []);

    const loadPointData = useCallback(async (layer: PointLayerConfig): Promise<FeatureCollection<Point> | null> => {
        try {
            const response = await fetch(layer.filePath);
            return await response.json();
        } catch (err) {
            console.error(`Error loading ${layer.name} data:`, err);
            return null;
        }
    }, []);

    useEffect(() => {
        void loadPointLayersConfig();
    }, [loadPointLayersConfig]);

    const visibleLayerIds = useMemo(() =>
            pointLayers.filter(l => l.visible).map(l => l.id).join(','),
        [pointLayers]
    );

    useEffect(() => {
        const loadVisibleLayers = async () => {
            const visibleLayers = pointLayers.filter(layer => layer.visible && !layer.data);

            for (const layer of visibleLayers) {
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
            }
        };

        void loadVisibleLayers();
    }, [visibleLayerIds, loadPointData]);

    const togglePointLayer = useCallback((layerId: string) => {
        setPointLayers(prev =>
            prev.map(layer =>
                layer.id === layerId
                    ? { ...layer, visible: !layer.visible }
                    : layer
            )
        );
    }, []);

    return {
        pointLayers,
        togglePointLayer
    };
};