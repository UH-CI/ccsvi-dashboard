import { Feature } from "geojson";
import { FeaturePopup, type HcdpPopupField } from "../components/FeaturePopup";
import { GeographiesData } from "../types";

interface PopupConfig {
  fields: Array<{ key: string; label: string }>;
  geoidProperty: string;
}

export interface PolygonPopupContext {
  config: PopupConfig;
  activeMetric: string;
  getMetricValue: (geoid: string) => number | null;
  geographiesData: GeographiesData | null;
  activeMetric2?: string | null;
  getMetricValue2?: ((geoid: string) => number | null) | null;
  getMetricMoE?: ((geoid: string) => number | null) | null;
  getMetricMoE2?: ((geoid: string) => number | null) | null;
}

export function buildPolygonPopupHtml(
  feature: Feature,
  ctx: PolygonPopupContext,
  hcdp?: HcdpPopupField,
): string | null {
  const geoid = feature.properties?.[ctx.config.geoidProperty];
  if (!geoid) return null;

  const geoidStr = String(geoid);
  const metricValue = ctx.getMetricValue(geoidStr);
  const metricValue2 = ctx.getMetricValue2?.(geoidStr) ?? null;
  const metricMoE = ctx.getMetricMoE?.(geoidStr) ?? null;
  const metricMoE2 = ctx.getMetricMoE2?.(geoidStr) ?? null;
  const metadataEntry = ctx.geographiesData?.[geoidStr];

  const metadata = [];
  if (metadataEntry?.county) metadata.push(metadataEntry.county);
  if (metadataEntry?.block_group) metadata.push(metadataEntry.block_group);
  if (metadataEntry?.census_tract) metadata.push(metadataEntry.census_tract);

  if (metadata.length === 0 && feature.properties?.NAME10) {
    metadata.push(feature.properties.NAME10);
  }

  return FeaturePopup({
    metadata: metadata.length > 0 ? metadata : undefined,
    feature,
    fields: ctx.config.fields,
    metricName: ctx.activeMetric,
    metricValue,
    metricMoE,
    metricName2: ctx.activeMetric2 ?? undefined,
    metricValue2: metricValue2 ?? undefined,
    metricMoE2,
    hcdp,
  });
}

export function renderPolygonPopup(
  config: PopupConfig,
  activeMetric: string,
  getMetricValue: (geoid: string) => number | null,
  geographiesData: GeographiesData | null,
  activeMetric2?: string | null,
  getMetricValue2?: ((geoid: string) => number | null) | null,
  getMetricMoE?: ((geoid: string) => number | null) | null,
  getMetricMoE2?: ((geoid: string) => number | null) | null,
) {
  const ctx: PolygonPopupContext = {
    config,
    activeMetric,
    getMetricValue,
    geographiesData,
    activeMetric2,
    getMetricValue2,
    getMetricMoE,
    getMetricMoE2,
  };

  return (feature: Feature): string | null => buildPolygonPopupHtml(feature, ctx);
}
