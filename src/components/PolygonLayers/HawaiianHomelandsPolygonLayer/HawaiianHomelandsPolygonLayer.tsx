
import React, { useCallback, useEffect } from "react";
import { Feature, FeatureCollection, Geometry } from "geojson";
import { HawaiianHomelandProperties, MetricsData } from "../../../types";
import { GenericPolygonLayer, StyleConfig } from "../GenericPolygonLayer/GenericPolygonLayer.tsx";
import { LeafletMouseEvent } from "leaflet";
import { FeaturePopup } from "../../FeaturePopup";
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

    const renderPopup = useCallback((feature: Feature<Geometry, HawaiianHomelandProperties>): string | null => {
        const geoid = feature.properties?.[LAYER_CONFIG.geoidProperty as keyof HawaiianHomelandProperties];
        if (!geoid) return null;

        const geoidStr = String(geoid);
        const metricValue = getMetricValue(geoidStr);

        const metadataEntry = metricsData?.[geoidStr];

        const metadata = [];
        if (metadataEntry?.county) metadata.push(metadataEntry.county);
        if (metadataEntry?.block_group) metadata.push(metadataEntry.block_group);
        if (metadataEntry?.census_tract) metadata.push(metadataEntry.census_tract);

        return FeaturePopup({
            metadata: metadata.length > 0 ? metadata : undefined,
            feature,
            fields: LAYER_CONFIG.popup.fields,
            metricName: activeMetric,
            metricValue
        })
    }, [activeMetric, getMetricValue, metricsData]);

    useEffect(() => {
        console.log('Hawaiian Homelands Data:', {
            hasData: !!data,
            featureCount: data?.features?.length,
            geoidProperty: LAYER_CONFIG.geoidProperty
        });
    }, [data]);

    return (
        <GenericPolygonLayer
            data={data}
            mapId={mapId}
            geoidProperty={LAYER_CONFIG.geoidProperty}
            getStyle={getStyle}
            getHighlightStyle={getHighlightStyle}
            activeFeatureGeoid={activeFeatureGeoid}
            onFeatureClick={handleFeatureClick}
            renderPopup={renderPopup}
        />
    );
};