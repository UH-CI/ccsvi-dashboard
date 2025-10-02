import {Feature, FeatureCollection, Geometry} from "geojson";
import {BlockGroupProperties, MetricsData} from "../../../types";
import {useCallback} from "react";
import {GenericPolygonLayer, StyleConfig} from "../GenericPolygonLayer/GenericPolygonLayer.tsx";
import {LeafletMouseEvent} from "leaflet";
import {FeaturePopup} from "../../FeaturePopup";

interface CensusPolygonLayerProps {
    data: FeatureCollection<Geometry, BlockGroupProperties> | null;
    metricsData: MetricsData | null;
    mapId: string;
    activeDataset: string;
    activeMetric: string;
    activeFeatureGeoid?: string | null;
    getColor: (value: number | null) => string;
    grayOut?: boolean;
    onFeatureClick?: (feature: Feature<Geometry, BlockGroupProperties>, e: LeafletMouseEvent) => void;
}

export const CensusPolygonLayer: React.FC<CensusPolygonLayerProps> = ({
    data,
    metricsData,
    mapId,
    activeDataset,
    activeMetric,
    activeFeatureGeoid,
    getColor,
    grayOut,
    onFeatureClick
}) => {
    const getMetricValue = useCallback((geoid: string): number | null => {
        if (!metricsData || !activeDataset || !activeMetric) return null;

        const blockGroupData = metricsData[geoid];
        if (!blockGroupData?.metrics?.[activeDataset]) return null;

        return blockGroupData.metrics[activeDataset][activeMetric] ?? null;
    }, [metricsData, activeDataset, activeMetric]);

    const getStyle = useCallback((feature: Feature<Geometry, BlockGroupProperties> | undefined): StyleConfig => {
        if (!feature) {
            return {
                fillColor: '#cccccc',
                weight: 0.5,
                opacity: 1,
                color: '#333',
                fillOpacity: 0.3
            };
        }
        
        const geoid = feature.properties?.geoid20;

        if (!geoid) {
            return {
                fillColor: '#cccccc',
                weight: 0.5,
                opacity: 1,
                color: '#333',
                fillOpacity: 0.3
            };
        }

        if (grayOut) {
            return {
                fillColor: '#e0e0e0',
                weight: 0.8,
                opacity: 0.5,
                color: '#999',
                fillOpacity: 0.8,
                dashArray: '5, 5'
            };
        }

        const metricValue = getMetricValue(geoid);
        const fillColor = getColor(metricValue);

        return {
            fillColor,
            weight: 0.5,
            opacity: 1,
            color: '#333',
            fillOpacity: 0.3
        }
    }, [grayOut, getMetricValue, getColor])

    const getHighlightStyle = useCallback((feature: Feature<Geometry, BlockGroupProperties>, baseStyle: StyleConfig | undefined): StyleConfig => {
        return {
            fillColor: baseStyle?.fillColor || '#cccccc',
            weight: 4,
            color: '#000000',
            fillOpacity: 0.8,
            opacity: 1
        };
    }, []);

    const handleFeatureClick = useCallback((feature: Feature<Geometry, BlockGroupProperties>, e: LeafletMouseEvent) => {
        if (onFeatureClick) {
            onFeatureClick(feature, e);
        }
    }, [onFeatureClick]);

    const renderPopup = useCallback((feature: Feature<Geometry, BlockGroupProperties>): string | null => {
        const geoid = feature.properties?.geoid20;
        if (!geoid) return null;

        const metricValue = getMetricValue(geoid);
        return FeaturePopup({
            title: 'Census Block Group ' + geoid,
            feature,
            fields: [
                { key: 'pop20', label: '2020 Population' },
                { key: 'aland20', label: 'Land Area (sq. meters)' }
            ],
            metricName: activeMetric,
            metricValue
        })
    }, [activeMetric, getMetricValue]);

    return (
        <GenericPolygonLayer
            data={data}
            mapId={mapId}
            geoidProperty='geoid20'
            getStyle={getStyle}
            getHighlightStyle={getHighlightStyle}
            activeFeatureGeoid={activeFeatureGeoid}
            onFeatureClick={handleFeatureClick}
            renderPopup={renderPopup}
        />
    );
};