import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "../stores";
import { usePointLayerStore } from "../stores/usePointLayersStore";
import { POINT_LAYERS } from "../config/pointLayers";
import { getPointsByGeoid } from "../api/client";
import type { PointLayerConfig } from "../types";

export interface PointCounts {
  loading: boolean;
  counts: Record<string, number | null>;
}

const datasetIdFor = (layerId: string, isHomelands: boolean): string =>
  isHomelands ? `${layerId}_points_homelands` : `${layerId}_points`;

// Per-layer point counts for one block group / Hawaiian Homeland area
export function usePointCounts(geoid: string | null, isHomelands: boolean): PointCounts {
  const metricValuesCache = useAppStore((state) => state.metricValuesCache);
  const fetchMetricValues = useAppStore((state) => state.fetchMetricValues);

  useEffect(() => {
    for (const layer of POINT_LAYERS) {
      fetchMetricValues(datasetIdFor(layer.id, isHomelands), "Count");
    }
  }, [isHomelands, fetchMetricValues]);

  return useMemo(() => {
    if (!geoid) return { loading: false, counts: {} };

    let loading = false;
    const counts: Record<string, number | null> = {};
    for (const layer of POINT_LAYERS) {
      const cacheKey = `${datasetIdFor(layer.id, isHomelands)}::Count`;
      const cached = metricValuesCache[cacheKey];
      if (cached === undefined) {
        loading = true;
        counts[layer.id] = null;
        continue;
      }
      counts[layer.id] = cached[geoid]?.absolute ?? null;
    }
    return { loading, counts };
  }, [geoid, isHomelands, metricValuesCache]);
}

// Same lookup as usePointCounts hook, for use outside of react components (like the popup)
export async function fetchPointCounts(
  geoid: string,
  isHomelands: boolean,
): Promise<Record<string, number | null>> {
  const { fetchMetricValues } = useAppStore.getState();
  await Promise.all(
    POINT_LAYERS.map((layer) => fetchMetricValues(datasetIdFor(layer.id, isHomelands), "Count")),
  );

  const cache = useAppStore.getState().metricValuesCache;
  const counts: Record<string, number | null> = {};
  for (const layer of POINT_LAYERS) {
    const cacheKey = `${datasetIdFor(layer.id, isHomelands)}::Count`;
    counts[layer.id] = cache[cacheKey]?.[geoid]?.absolute ?? null;
  }
  return counts;
}

export interface TablePointCounts {
  layers: PointLayerConfig[]; // currently visible on the map
  getCount: (layerId: string, geoid: string) => number;
}

// Point counts for every geoid, across whichever layers are currently toggled on map
export function usePointCountsForTable(isHomelands: boolean, mapId: string): TablePointCounts {
  const metricValuesCache = useAppStore((state) => state.metricValuesCache);
  const fetchMetricValues = useAppStore((state) => state.fetchMetricValues);
  const visibleIds = usePointLayerStore((state) => state.visibleLayerIdsByMap[mapId]);

  const layers = useMemo(
    () => POINT_LAYERS.filter((layer) => visibleIds?.has(layer.id)),
    [visibleIds],
  );

  useEffect(() => {
    for (const layer of layers) {
      fetchMetricValues(datasetIdFor(layer.id, isHomelands), "Count");
    }
  }, [layers, isHomelands, fetchMetricValues]);

  return useMemo(() => {
    const getCount = (layerId: string, geoid: string): number => {
      const cacheKey = `${datasetIdFor(layerId, isHomelands)}::Count`;
      return metricValuesCache[cacheKey]?.[geoid]?.absolute ?? 0;
    };
    return { layers, getCount };
  }, [layers, isHomelands, metricValuesCache]);
}

// Shared across every table, so switching tabs/rows never re-fetches a layer already fetched
const namesCache: Record<string, Promise<Record<string, string[]>>> = {};

function fetchNamesOnce(layerId: string, isHomelands: boolean): Promise<Record<string, string[]>> {
  const cacheKey = `${datasetIdFor(layerId, isHomelands)}::names`;
  if (!namesCache[cacheKey]) {
    namesCache[cacheKey] = getPointsByGeoid(layerId, isHomelands);
  }
  return namesCache[cacheKey];
}

export interface TablePointNames {
  layers: PointLayerConfig[]; // currently visible on the map
  getNames: (layerId: string, geoid: string) => string[];
}

// Point names for every geoid, across whichever layers are currently toggled on map
export function usePointNamesForTable(isHomelands: boolean, mapId: string): TablePointNames {
  const visibleIds = usePointLayerStore((state) => state.visibleLayerIdsByMap[mapId]);
  const layers = useMemo(
    () => POINT_LAYERS.filter((layer) => visibleIds?.has(layer.id)),
    [visibleIds],
  );

  const [namesByLayer, setNamesByLayer] = useState<Record<string, Record<string, string[]>>>({});

  useEffect(() => {
    let cancelled = false;
    for (const layer of layers) {
      fetchNamesOnce(layer.id, isHomelands).then((data) => {
        if (!cancelled) setNamesByLayer((prev) => ({ ...prev, [layer.id]: data }));
      });
    }
    return () => {
      cancelled = true;
    };
  }, [layers, isHomelands]);

  return useMemo(() => {
    const getNames = (layerId: string, geoid: string): string[] => namesByLayer[layerId]?.[geoid] ?? [];
    return { layers, getNames };
  }, [layers, namesByLayer]);
}