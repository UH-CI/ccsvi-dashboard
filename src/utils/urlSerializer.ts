import type { MapConfig } from "../types";
import { MAX_MAPS, MENU_KEYS } from "../config";

// Each map's settings saved in the link as <prefix>_<mapId>; an empty value isn't written, and an indicator key the menu lacks is dropped
export const MAP_URL_FIELDS: {
  prefix: string;
  read: (config: MapConfig) => string | undefined;
  write: (value: string) => Partial<MapConfig>;
}[] = [
  {
    prefix: "m",
    read: (c) => c.metric,
    write: (metric) => (MENU_KEYS.has(metric) ? { metric } : {}),
  },
  {
    prefix: "m2",
    read: (c) => c.metric2,
    write: (metric2) => (MENU_KEYS.has(metric2) ? { metric2 } : {}),
  },
  {
    prefix: "bcs",
    read: (c) => c.bivariateColorScheme,
    write: (bivariateColorScheme) => ({ bivariateColorScheme }),
  },
  {
    prefix: "af",
    read: (c) => c.activeFeature?.geoid,
    write: (geoid) => ({ activeFeature: { geoid } }),
  },
];

// The link's lists of layers that are on: point layers, hazards and rasters
export const LAYER_LIST_KEYS = ["layers", "hazards", "rasters"] as const;
export type LayerListKey = (typeof LAYER_LIST_KEYS)[number];

// Layers that are on, per list, per map
export type LayersOn = Record<LayerListKey, Record<string, Iterable<string>>>;

export interface UrlState {
  mapConfigs: (Partial<MapConfig> & { id: string })[];
  primaryMapId?: string;
  layers: Record<LayerListKey, Record<string, string[]>>;
}

// One entry of a layer list, e.g. "map2:stormSurge.inundation_category4"
export const layerEntry = (mapId: string, layerId: string) => `${mapId}:${layerId}`;

// An entry back into its map and layer; null when it has no colon (e.g. from an edited link)
export function parseLayerEntry(entry: string): { mapId: string; layerId: string } | null {
  const colon = entry.indexOf(":");
  if (colon === -1) return null;
  return { mapId: entry.substring(0, colon), layerId: entry.substring(colon + 1) };
}

// The maps, primary map and layers a link describes. A hand-edited link can hold a bad map id
// or too many maps, so only ids like "map3" are kept, and only the first MAX_MAPS of them.
export function readUrl(params: URLSearchParams): UrlState {
  const mapConfigs = (params.get("maps") ?? "")
    .split(",")
    .map((entry) => {
      const [id, visibility] = entry.split(":");
      const config: Partial<MapConfig> & { id: string } = { id, visible: visibility === "vis" };
      for (const field of MAP_URL_FIELDS) {
        const value = params.get(`${field.prefix}_${id}`);
        if (value) Object.assign(config, field.write(value));
      }
      return config;
    })
    .filter((config) => /^map\d+$/.test(config.id))
    .slice(0, MAX_MAPS);

  const layers = {} as UrlState["layers"];
  for (const key of LAYER_LIST_KEYS) {
    layers[key] = {};
    for (const entry of (params.get(key) ?? "").split(",").filter(Boolean)) {
      const parsed = parseLayerEntry(entry);
      if (parsed) (layers[key][parsed.mapId] ??= []).push(parsed.layerId);
    }
  }

  return { mapConfigs, primaryMapId: params.get("active") || undefined, layers };
}

// The app's part of the address. One map with nothing chosen writes no map settings, so a fresh page has a clean link.
export function writeUrl(
  mapConfigs: MapConfig[],
  primaryMapId: string,
  layersOn: LayersOn,
): URLSearchParams {
  const params = new URLSearchParams();
  const isDefault = mapConfigs.length === 1 && !mapConfigs[0].metric;

  if (!isDefault) {
    params.set("maps", mapConfigs.map((c) => `${c.id}:${c.visible ? "vis" : "hid"}`).join(","));
    for (const field of MAP_URL_FIELDS) {
      for (const config of mapConfigs) {
        const value = field.read(config);
        if (value) params.set(`${field.prefix}_${config.id}`, value);
      }
    }
  }

  for (const key of LAYER_LIST_KEYS) {
    const entries = Object.entries(layersOn[key]).flatMap(([mapId, ids]) =>
      Array.from(ids, (layerId) => layerEntry(mapId, layerId)),
    );
    if (entries.length > 0) params.set(key, entries.sort().join(","));
  }

  if (!isDefault && primaryMapId) params.set("active", primaryMapId);
  return params;
}

// Whether a key in the address belongs to the app; others (e.g. from a hand-edited link) are left alone
export const isUrlKey = (key: string) =>
  key === "maps" ||
  key === "active" ||
  (LAYER_LIST_KEYS as readonly string[]).includes(key) ||
  MAP_URL_FIELDS.some((field) => key.startsWith(`${field.prefix}_`));
