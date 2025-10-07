import React, { useCallback, useMemo } from "react";
import { Feature, FeatureCollection, Geometry } from "geojson";
import { BlockGroupProperties, MetricsData } from "../../../types";
import { GenericPolygonLayer, StyleConfig } from "../GenericPolygonLayer/GenericPolygonLayer.tsx";
import { LeafletMouseEvent } from "leaflet";
import { renderPolygonPopup } from "../../../utils/renderPolygonPopup.ts";
import { POLYGON_LAYERS } from "../../../config";

interface CensusPolygonLayerProps {
    data: FeatureCollection<Geometry, BlockGroupProperties> | null;
    metricsData: MetricsData | null;
    getMetricValue: (geoid: string) => number | null;
    mapId: string;
    // activeDataset: string;
    activeMetric: string;
    activeFeatureGeoid?: string | null;
    getColor: (value: number | null) => string;
    onFeatureClick?: (feature: Feature<Geometry, BlockGroupProperties>, e: LeafletMouseEvent) => void;
}

const LAYER_CONFIG = POLYGON_LAYERS.censusBlockGroups;

export const CensusPolygonLayer: React.FC<CensusPolygonLayerProps> = ({
                                                                          data,
                                                                          metricsData,
                                                                          getMetricValue,
                                                                          mapId,
                                                                          // activeDataset,
                                                                          activeMetric,
                                                                          activeFeatureGeoid,
                                                                          getColor,
                                                                          onFeatureClick
                                                                      }) => {

    const getStyle = useCallback((feature: Feature<Geometry, BlockGroupProperties> | undefined): StyleConfig => {
        if (!feature) {
            return LAYER_CONFIG.styles.default;
        }

        const geoid = feature.properties?.[LAYER_CONFIG.geoidProperty as keyof BlockGroupProperties];

        if (!geoid) {
            return LAYER_CONFIG.styles.default;
        }


        const metricValue = getMetricValue(String(geoid));
        const fillColor = getColor(metricValue);

        return {
            ...LAYER_CONFIG.styles.default,
            fillColor
        }
    }, [getMetricValue, getColor]);

    const getHighlightStyle = useCallback((feature: Feature<Geometry, BlockGroupProperties>, baseStyle: StyleConfig | undefined): StyleConfig => {
        return {
            ...LAYER_CONFIG.styles.highlight,
            fillColor: baseStyle?.fillColor || LAYER_CONFIG.styles.default.fillColor
        };
    }, []);

    const handleFeatureClick = useCallback((feature: Feature<Geometry, BlockGroupProperties>, e: LeafletMouseEvent) => {
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
            layerType="census"
            geoidProperty={LAYER_CONFIG.geoidProperty}
            getStyle={getStyle}
            getHighlightStyle={getHighlightStyle}
            activeFeatureGeoid={activeFeatureGeoid}
            onFeatureClick={handleFeatureClick}
            renderPopup={renderPopup}
        />
    );
};