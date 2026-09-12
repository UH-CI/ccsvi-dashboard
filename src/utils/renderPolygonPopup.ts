import { Feature } from "geojson";
import { FeaturePopup, type HcdpPopupField, type OverlayPopupField } from "../components/FeaturePopup";
import { GeographiesData } from "../types";
import { getReliabilityLabel } from "./reliability";
import type { MetricLookup } from "../components/SingleMapView/hooks/useMetricLookups";

interface PopupConfig {
  fields: Array<{ key: string; label: string }>;
  geoidProperty: string;
}

export interface PolygonPopupContext {
  config: PopupConfig;
  activeMetric: string;
  metric1: MetricLookup;
  geographiesData: GeographiesData | null;
  activeMetric2?: string | null;
  metric2?: MetricLookup | null;
}

export function buildPolygonPopupHtml(
  feature: Feature,
  ctx: PolygonPopupContext,
  hcdp?: HcdpPopupField,
  overlay?: OverlayPopupField,
): string | null {
  const geoid = feature.properties?.[ctx.config.geoidProperty];
  if (!geoid) return null;

  const geoidStr = String(geoid);
  const data1 = ctx.metric1.getData(geoidStr);
  const metadataEntry = ctx.geographiesData?.[geoidStr];

  const metric1Display =
    data1.value !== null
      ? {
          name: ctx.activeMetric,
          value: data1.value,
          moePp: data1.moePp,
          reliability: getReliabilityLabel(data1.absolute, data1.moe, data1.cv, !ctx.metric1.hasMoE),
        }
      : undefined;

  const data2 = ctx.metric2 ? ctx.metric2.getData(geoidStr) : null;
  const metric2Display =
    ctx.activeMetric2 && ctx.metric2 && data2 && data2.value !== null
      ? {
          name: ctx.activeMetric2,
          value: data2.value,
          moePp: data2.moePp,
          reliability: getReliabilityLabel(data2.absolute, data2.moe, data2.cv, !ctx.metric2.hasMoE),
        }
      : undefined;

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
    metric1: metric1Display,
    metric2: metric2Display,
    hcdp,
    overlay,
  });
}

export function renderPolygonPopup(ctx: PolygonPopupContext) {
  return (feature: Feature): string | null => buildPolygonPopupHtml(feature, ctx);
}
