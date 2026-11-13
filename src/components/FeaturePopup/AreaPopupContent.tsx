import type { Feature, Geometry, GeoJsonProperties } from "geojson";
import { useQuery } from "@tanstack/react-query";
import { useGeographies } from "../../api/queries/geographies";
import { useVisiblePointCounts } from "../../hooks/useVisiblePointCounts";
import { areaStatsQuery } from "../../api/queries/rasterInfo";
import { useSavedRaster } from "../../hooks/useSavedRaster";
import { useMapRaster } from "../../stores/useMapLayersStore";
import type { RasterSource } from "../../types";
import type { MetricLookup } from "../SingleMapView/hooks/useMetricLookups";
import {
  FeaturePopup,
  type HcdpPopupField,
  type MetricDisplay,
  type OverlayPopupField,
  type PointCountsPopupField,
} from "./FeaturePopup";

interface AreaPopupContentProps {
  feature: Feature<Geometry, GeoJsonProperties>;
  mapId: string;
  // Hawaiian Homelands areas, else block groups
  homelands: boolean;
  // The area's own columns listed under the heading, and the column holding its geoid
  fields: { key: string; label: string }[];
  geoidProperty: string;
  label1: string;
  metric1: MetricLookup;
  label2?: string;
  metric2: MetricLookup | null;
}

// Never asked for; stands in while the map has no HCDP raster
const NO_HCDP: RasterSource = { kind: "hcdp", params: {} };

// An indicator's row when the map shows one; an area with no value keeps the row, showing N/A
function metricDisplay(name: string | undefined, lookup: MetricLookup | null, geoid: string) {
  if (!name || !lookup) return undefined;
  const { value, moePp, reliability } = lookup.getData(geoid);
  return { name, value, kind: lookup.kind, moePp, reliability } satisfies MetricDisplay;
}

// A block group's or Homelands area's popup: where it is, its indicators, and the map's raster and
// point layers there. Each later value shows "Calculating…" until it arrives, and the popup follows
// the map while it's open.
export function AreaPopupContent({
  feature,
  mapId,
  homelands,
  fields,
  geoidProperty,
  label1,
  metric1,
  label2,
  metric2,
}: AreaPopupContentProps) {
  const geoid = String(feature.properties?.[geoidProperty] ?? "");
  const place = useGeographies()?.[geoid];

  const counts = useVisiblePointCounts(homelands, mapId);
  const saved = useSavedRaster(homelands, mapId);
  const shown = useMapRaster(mapId);
  const hcdpSource = shown?.raster.kind === "hcdp" ? shown.source : null;
  const hcdpStats = useQuery({
    ...areaStatsQuery(hcdpSource ?? NO_HCDP, geoid, feature),
    enabled: hcdpSource !== null,
  });

  const metadata = place
    ? [place.county, place.block_group, place.census_tract].filter((line): line is string =>
        Boolean(line),
      )
    : [];
  if (metadata.length === 0 && feature.properties?.NAME10) metadata.push(feature.properties.NAME10);

  // A layer whose counts couldn't be fetched shows N/A; a layer with none here isn't listed
  const pointCounts: PointCountsPopupField = counts.loading
    ? { loading: true, items: [] }
    : {
        items: counts.layers.flatMap<PointCountsPopupField["items"][number]>((layer) => {
          if (counts.failed(layer.id)) return [{ layer, value: null }];
          const value = counts.getCount(layer.id, geoid) ?? 0;
          return value > 0 ? [{ layer, value }] : [];
        }),
      };

  const hcdp: HcdpPopupField | undefined = hcdpSource
    ? {
        label: shown!.name,
        loading: hcdpStats.isPending,
        meanValue: hcdpStats.data?.mean ?? null,
        maxValue: hcdpStats.data?.max ?? null,
      }
    : undefined;

  const overlay: OverlayPopupField | undefined = saved
    ? {
        label: saved.name,
        loading: saved.loading,
        meanValue: saved.getMean(geoid),
        maxValue: saved.getMax(geoid),
        suffix: saved.units ? ` ${saved.units}` : "",
      }
    : undefined;

  return (
    <FeaturePopup
      metadata={metadata.length > 0 ? metadata : undefined}
      properties={feature.properties ?? {}}
      fields={fields}
      metric1={metricDisplay(label1, metric1, geoid)}
      metric2={metricDisplay(label2, metric2, geoid)}
      hcdp={hcdp}
      overlay={overlay}
      pointCounts={pointCounts}
    />
  );
}
