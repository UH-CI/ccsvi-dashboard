import React, { useCallback } from "react";
import { Feature, FeatureCollection, Geometry } from "geojson";
import { BlockGroupProperties, MetricsData } from "../../../types";
import { GenericPolygonLayer, StyleConfig } from "../GenericPolygonLayer/GenericPolygonLayer.tsx";
import { LeafletMouseEvent } from "leaflet";
import { FeaturePopup } from "../../FeaturePopup";
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
    grayOut?: boolean;
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
    grayOut = false,
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

        if (grayOut) {
            return LAYER_CONFIG.styles.grayedOut;
        }

        const metricValue = getMetricValue(String(geoid));
        const fillColor = getColor(metricValue);

        return {
            ...LAYER_CONFIG.styles.default,
            fillColor
        }
    }, [grayOut, getMetricValue, getColor])

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

    const renderPopup = useCallback((feature: Feature<Geometry, BlockGroupProperties>): string | null => {
        const geoid = feature.properties?.[LAYER_CONFIG.geoidProperty as keyof BlockGroupProperties];
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