import { Feature } from "geojson";
import { FeaturePopup } from "../components/FeaturePopup";
import { MetricsData } from "../types";

interface PopupConfig {
  fields: Array<{ key: string; label: string }>;
  geoidProperty: string;
}

export function renderPolygonPopup(
  config: PopupConfig,
  activeMetric: string,
  getMetricValue: (geoid: string) => number | null,
  metricsData: MetricsData | null,
  activeMetric2?: string | null,
  getMetricValue2?: ((geoid: string) => number | null) | null,
  getMetricMoE?: ((geoid: string) => number | null) | null,
  getMetricMoE2?: ((geoid: string) => number | null) | null,
) {
  return (feature: Feature): string | null => {
    const geoid = feature.properties?.[config.geoidProperty];
    if (!geoid) return null;

    const geoidStr = String(geoid);
    const metricValue = getMetricValue(geoidStr);
    const metricValue2 = getMetricValue2?.(geoidStr) ?? null;
    const metricMoE = getMetricMoE?.(geoidStr) ?? null;
    const metricMoE2 = getMetricMoE2?.(geoidStr) ?? null;
    const metadataEntry = metricsData?.[geoidStr];

    const metadata = [];
    if (metadataEntry?.county) metadata.push(metadataEntry.county);
    if (metadataEntry?.block_group) metadata.push(metadataEntry.block_group);
    if (metadataEntry?.census_tract) metadata.push(metadataEntry.census_tract);

    // Fallback for Hawaiian Homelands: use NAME10 as metadata title
    if (metadata.length === 0 && feature.properties?.NAME10) {
      metadata.push(feature.properties.NAME10);
    }

    return FeaturePopup({
      metadata: metadata.length > 0 ? metadata : undefined,
      feature,
      fields: config.fields,
      metricName: activeMetric,
      metricValue,
      metricMoE,
      metricName2: activeMetric2 ?? undefined,
      metricValue2: metricValue2 ?? undefined,
      metricMoE2,
    });
  };
}
