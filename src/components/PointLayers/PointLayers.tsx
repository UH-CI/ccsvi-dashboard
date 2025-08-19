/**
 * PointLayers, markers, zoom tracking all generated using Anthropic's Claude Sonnet 4
 */

import React, { useState, useEffect } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';
import { renderToString } from 'react-dom/server';
import * as FaIcons from 'react-icons/fa';
import L from 'leaflet';
import { Feature, Point } from 'geojson';
import styles from './PointLayers.module.scss';
import { PointLayerConfig } from "../../types";

export const GenericPointMarkers: React.FC<{
    layer: PointLayerConfig;
}> = ({ layer }) => {
    const map = useMap();
    const [zoom, setZoom] = useState(map.getZoom());

    useEffect(() => {
        const handleZoom = () => {
            setZoom(map.getZoom());
        };

        map.on('zoomend', handleZoom);

        return () => {
            map.off('zoomend', handleZoom);
        };
    }, [map]);

    if (!layer.visible || !layer.data) return null;

    const IconComponent = FaIcons[layer.icon as keyof typeof FaIcons] || FaIcons.FaCircle;

    // Calculate icon size based on zoom level
    const getIconSize = (currentZoom: number): number => {
        const baseZoom = 8;
        const baseSize = 18;

        // Scale factor: adjust this to control how much icons grow/shrink
        const scaleFactor = 0.15;

        // Calculate size with min/max bounds
        const calculatedSize = baseSize + (currentZoom - baseZoom) * scaleFactor * baseSize;

        const minSize = 8;
        const maxSize = 32;

        return Math.max(minSize, Math.min(maxSize, Math.round(calculatedSize)));
    };

    const iconSize = getIconSize(zoom);
    const iconElementSize = Math.round(iconSize * 0.67);

    const customIcon = L.divIcon({
        html: renderToString(
            <div
                className={styles.iconContainer}
                style={{
                    width: `${iconSize}px`,
                    height: `${iconSize}px`,
                    color: layer.color,
                }}
            >
                <IconComponent size={iconElementSize} />
            </div>
        ),
        className: styles.genericPointMarker,
        iconSize: [iconSize, iconSize],
        iconAnchor: [iconSize / 2, iconSize / 2]
    });

    const renderPopupContent = (feature: Feature<Point>) => {
        const title = feature.properties?.[layer.popupConfig.titleField] || '';

        const fields = layer.popupConfig.fields
            .map(field => {
                const value = feature.properties?.[field.key];
                if (value === null || value === undefined || value === '') return null;

                return `<b>${field.label}:</b> ${value}<br/>`;
            })
            .filter(Boolean)
            .join('');

        return `<div class="${styles.popupContent}"><b>${title}</b><br/>${fields}</div>`;
    };

    return (
        <>
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