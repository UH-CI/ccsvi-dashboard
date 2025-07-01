/**
 * PointLayers, markers, zoom tracking all generated using Anthropic's Claude Sonnet 4
 */

import React, { useState, useEffect } from 'react';
import { Marker, Popup, useMapEvents } from 'react-leaflet';
import { renderToString } from 'react-dom/server';
import * as FaIcons from 'react-icons/fa';
import L from 'leaflet';
import { FeatureCollection, Feature, Point } from 'geojson';

export interface PointLayerConfig {
    id: string;
    name: string;
    visible: boolean;
    icon: string;
    color: string;
    filePath: string;
    data?: FeatureCollection<Point>;
    popupConfig: {
        titleField: string;
        fields: Array<{
            key: string;
            label: string;
        }>;
    };
}

// Component to track zoom and update all markers
const ZoomTracker: React.FC<{ onZoomChange: (zoom: number) => void }> = ({ onZoomChange }) => {
    useMapEvents({
        zoomend: (e) => {
            onZoomChange(e.target.getZoom());
        },
    });
    return null;
};

export const GenericPointMarkers: React.FC<{ layer: PointLayerConfig }> = ({ layer }) => {
    const [currentZoom, setCurrentZoom] = useState(10);

    if (!layer.visible || !layer.data) return null;

    const IconComponent = FaIcons[layer.icon as keyof typeof FaIcons] || FaIcons.FaCircle;

    // Calculate size based on zoom (simple linear scaling)
    const getSize = (zoom: number) => {
        const minSize = 8;
        const maxSize = 36;

        const size = minSize + ((zoom - 8) * (maxSize - minSize)) / (15 - 8);
        return Math.max(minSize, Math.min(maxSize, size));
    };

    const iconSize = Math.round(getSize(currentZoom));
    const iconElementSize = Math.round(iconSize * 0.67);

    const customIcon = L.divIcon({
        html: renderToString(
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: `${iconSize}px`,
                height: `${iconSize}px`,
                color: layer.color,
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
            }}>
                <IconComponent size={iconElementSize} />
            </div>
        ),
        className: 'generic-point-marker',
        iconSize: [iconSize, iconSize],
        iconAnchor: [iconSize / 2, iconSize / 2]
    });

    const renderPopupContent = (feature: Feature<Point>) => {
        const title = feature.properties?.[layer.popupConfig.titleField] || 'Unknown';

        const fields = layer.popupConfig.fields
            .map(field => {
                const value = feature.properties?.[field.key];
                if (value === null || value === undefined || value === '') return null;

                return `<b>${field.label}:</b> ${value}<br/>`;
            })
            .filter(Boolean)
            .join('');

        return `<div><b>${title}</b><br/>${fields}</div>`;
    };

    return (
        <>
            <ZoomTracker onZoomChange={setCurrentZoom} />
            {layer.data.features
                .filter(feature => {
                    const objectId = feature.properties?.objectid || feature.properties?.OBJECTID;
                    return objectId !== 0;
                })
                .map((feature, index) => {
                    const featureId = feature.properties?.objectid ||
                        feature.properties?.OBJECTID ||
                        feature.properties?.id ||
                        index;

                    const coordinates = feature.geometry.coordinates;
                    const [longitude, latitude] = coordinates;

                    return (
                        <Marker
                            key={`${layer.id}-${featureId}`}
                            position={[latitude, longitude]}
                            icon={customIcon}
                        >
                            <Popup>
                                <div dangerouslySetInnerHTML={{
                                    __html: renderPopupContent(feature)
                                }} />
                            </Popup>
                        </Marker>
                    );
                })}
        </>
    );
};

export const usePointLayers = () => {
    const [pointLayers, setPointLayers] = useState<PointLayerConfig[]>([]);

    useEffect(() => {
        const loadPointLayersConfig = async () => {
            try {
                const response = await fetch('/data/point_data/point_layers.json');
                const config = await response.json();
                setPointLayers(config.pointLayers);
            } catch (err) {
                console.error('Error loading point layers configuration:', err);
            }
        };

        loadPointLayersConfig();
    }, []);

    const loadPointData = async (layer: PointLayerConfig): Promise<FeatureCollection<Point> | null> => {
        try {
            const response = await fetch(layer.filePath);
            const data = await response.json();
            return data;
        } catch (err) {
            console.error(`Error loading ${layer.name} data:`, err);
            return null;
        }
    };

    useEffect(() => {
        const loadVisibleLayers = async () => {
            const visibleLayers = pointLayers.filter(layer => layer.visible && !layer.data);

            for (const layer of visibleLayers) {
                const data = await loadPointData(layer);
                if (data) {
                    setPointLayers(prev =>
                        prev.map(l =>
                            l.id === layer.id
                                ? { ...l, data }
                                : l
                        )
                    );
                }
            }
        };

        loadVisibleLayers();
    }, [pointLayers.map(l => l.visible).join(',')]);

    const togglePointLayer = (layerId: string) => {
        setPointLayers(prev =>
            prev.map(layer =>
                layer.id === layerId
                    ? { ...layer, visible: !layer.visible }
                    : layer
            )
        );
    };

    return {
        pointLayers,
        togglePointLayer
    };
};