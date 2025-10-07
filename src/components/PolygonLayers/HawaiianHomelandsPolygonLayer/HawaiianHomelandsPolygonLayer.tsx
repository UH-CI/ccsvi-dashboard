
import React, { useCallback, useMemo } from "react";
import { Feature, FeatureCollection, Geometry } from "geojson";
import { HawaiianHomelandProperties, MetricsData } from "../../../types";
import { GenericPolygonLayer, StyleConfig } from "../GenericPolygonLayer/GenericPolygonLayer.tsx";
import { LeafletMouseEvent } from "leaflet";
import { renderPolygonPopup } from "../../../utils/renderPolygonPopup.ts";
import { POLYGON_LAYERS } from "../../../config";

interface HawaiianHomelandsPolygonLayerProps {
    data: FeatureCollection<Geometry, HawaiianHomelandProperties> | null;
    metricsData: MetricsData | null;
    getMetricValue: (geoid: string) => number | null;
    mapId: string;
    // activeDataset: string;
    activeMetric: string;
    activeFeatureGeoid?: string | null;
    getColor: (value: number | null) => string;
    // grayOut?: boolean;
    onFeatureClick?: (feature: Feature<Geometry, HawaiianHomelandProperties>, e: LeafletMouseEvent) => void;
}

const LAYER_CONFIG = POLYGON_LAYERS.hawaiianHomelands;

export const HawaiianHomelandsPolygonLayer: React.FC<HawaiianHomelandsPolygonLayerProps> = ({
                                                                          data,
                                                                          metricsData,
                                                                          getMetricValue,
                                                                          mapId,
                                                                          // activeDataset,
                                                                          activeMetric,
                                                                          activeFeatureGeoid,
                                                                          getColor,
                                                                          // grayOut = false,
                                                                          onFeatureClick
                                                                      }) => {

    const getStyle = useCallback((feature: Feature<Geometry, HawaiianHomelandProperties> | undefined): StyleConfig => {
        if (!feature) {
            return LAYER_CONFIG.styles.default;
        }

        const geoid = feature.properties?.[LAYER_CONFIG.geoidProperty as keyof HawaiianHomelandProperties];

        if (!geoid) {
            return LAYER_CONFIG.styles.default;
        }

        const metricValue = getMetricValue(String(geoid));
        const fillColor = getColor(metricValue);

        return {
            ...LAYER_CONFIG.styles.default,
            fillColor
        }
    }, [getMetricValue, getColor])

    const getHighlightStyle = useCallback((feature: Feature<Geometry, HawaiianHomelandProperties>, baseStyle: StyleConfig | undefined): StyleConfig => {
        return {
            ...LAYER_CONFIG.styles.highlight,
            fillColor: baseStyle?.fillColor || LAYER_CONFIG.styles.default.fillColor
        };
    }, []);

    const handleFeatureClick = useCallback((feature: Feature<Geometry, HawaiianHomelandProperties>, e: LeafletMouseEvent) => {
        if (onFeatureClick) {
            onFeatureClick(feature, e);
        }
    }, [onFeatureClick]);

    const renderPopup = useMemo(
        () => renderPolygonPopup(
            {
                fields: LAYER_CONFIG.popup.fields,
                geoidProperty: LAYER_CONFIG.geoidProperty
            },
            activeMetric,
            getMetricValue,
            metricsData
        ),
        [activeMetric, getMetricValue, metricsData]
    );

    return (
        <GenericPolygonLayer
            data={data}
            mapId={mapId}
            layerType="hawaiian-homelands"
            geoidProperty={LAYER_CONFIG.geoidProperty}
            getStyle={getStyle}
            getHighlightStyle={getHighlightStyle}
            activeFeatureGeoid={activeFeatureGeoid}
            onFeatureClick={handleFeatureClick}
            renderPopup={renderPopup}
        />
    );
};