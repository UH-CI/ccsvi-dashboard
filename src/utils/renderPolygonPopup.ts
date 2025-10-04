import { Feature } from 'geojson';
import { FeaturePopup } from '../components/FeaturePopup';
import { MetricsData } from '../types';

interface PopupConfig {
    fields: Array<{ key: string; label: string }>;
    geoidProperty: string;
}

export function renderPolygonPopup(
    config: PopupConfig,
    activeMetric: string,
    getMetricValue: (geoid: string) => number | null,
    metricsData: MetricsData | null
) {
    return (feature: Feature): string | null => {
        const geoid = feature.properties?.[config.geoidProperty];
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
            fields: config.fields,
            metricName: activeMetric,
            metricValue
        });
    };
}