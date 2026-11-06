import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "../stores";
import { usePointLayerStore } from "../stores/usePointLayersStore";
import { POINT_LAYERS } from "../config/pointLayers";
import { getPointsByGeoid } from "../api/client";
import { queryClient } from "../api/queryClient";
import { datasetsQuery, useDatasets } from "../api/queries/datasets";
import type { PointLayerConfig } from "../types";
import { layerDatasetId } from "../utils/layerDatasets";

// Per-layer point counts for one block group / Hawaiian Homeland area, for use outside of react components (like the popup)
export async function fetchPointCounts(
  geoid: string,
  isHomelands: boolean,
): Promise<Record<string, number | null>> {
  const { fetchMetricValues } = useAppStore.getState();
  const catalog = await queryClient.fetchQuery(datasetsQuery);
  const datasets = POINT_LAYERS.map(
    (layer) => [layer.id, layerDatasetId(catalog, layer.id, isHomelands)] as const,
  );
  await Promise.all(datasets.map(([, dataset]) => dataset && fetchMetricValues(dataset, "Count")));

  const cache = useAppStore.getState().metricValuesCache;
  const counts: Record<string, number | null> = {};
  for (const [layerId, dataset] of datasets) {
    counts[layerId] = dataset ? (cache[`${dataset}::Count`]?.[geoid]?.absolute ?? null) : null;
  }
  return counts;
}

export interface TablePointCounts {
  layers: PointLayerConfig[]; // currently visible on the map
  getCount: (layerId: string, geoid: string) => number | null;
}

// Point counts for every geoid, across whichever layers are currently toggled on map; blank where a layer has none saved
export function usePointCountsForTable(isHomelands: boolean, mapId: string): TablePointCounts {
  const catalog = useDatasets();
  const metricValuesCache = useAppStore((state) => state.metricValuesCache);
  const fetchMetricValues = useAppStore((state) => state.fetchMetricValues);
  const visibleIds = usePointLayerStore((state) => state.visibleLayerIdsByMap[mapId]);

  const layers = useMemo(
    () => POINT_LAYERS.filter((layer) => visibleIds?.has(layer.id)),
    [visibleIds],
  );

  useEffect(() => {
    for (const layer of layers) {
      const dataset = layerDatasetId(catalog, layer.id, isHomelands);
      if (dataset) fetchMetricValues(dataset, "Count");
    }
  }, [layers, catalog, isHomelands, fetchMetricValues]);

  return useMemo(() => {
    const getCount = (layerId: string, geoid: string): number | null => {
      const dataset = layerDatasetId(catalog, layerId, isHomelands);
      return dataset ? (metricValuesCache[`${dataset}::Count`]?.[geoid]?.absolute ?? null) : null;
    };
    return { layers, getCount };
  }, [layers, catalog, isHomelands, metricValuesCache]);
}

// Shared across every table, so switching tabs/rows never re-fetches a layer already fetched
const namesCache: Record<string, Promise<Record<string, string[]>>> = {};

function fetchNamesOnce(layerId: string, isHomelands: boolean): Promise<Record<string, string[]>> {
  const cacheKey = `${layerId}::${isHomelands ? "homelands" : "block_groups"}`;
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