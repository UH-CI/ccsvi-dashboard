import { MapConfig } from "../types";

export interface SerializedMapState {
  maps: string;
  datasets: Record<string, string>;
  metrics: Record<string, string>;
  metrics2: Record<string, string>;
  bivariateColorSchemes: Record<string, string>;
  activeFeatures: Record<string, string>;
}

export interface DeserializedState {
  mapConfigs: Partial<MapConfig>[];
  primaryMapId?: string;
  pointLayers: string[];
  hazardLayers: string[];
  rasterLayers: string[];
}

/**
 * Serializes map configurations into URL-friendly format
 * Format: "map1:vis,map2:hid,map3:vis"
 */
export function serializeMapConfigs(configs: MapConfig[]): SerializedMapState {
  const maps = configs
    .map((config) => {
      const vis = config.visible ? "vis" : "hid";
      return `${config.id}:${vis}`;
    })
    .join(",");

  const datasets = configs.reduce(
    (acc, config) => {
      if (config.dataset) {
        acc[`d_${config.id}`] = config.dataset;
      }
      return acc;
    },
    {} as Record<string, string>,
  );

  const metrics = configs.reduce(
    (acc, config) => {
      if (config.metric) {
        acc[`m_${config.id}`] = config.metric;
      }
      return acc;
    },
    {} as Record<string, string>,
  );

  const metrics2 = configs.reduce(
    (acc, config) => {
      if (config.metric2) {
        acc[`m2_${config.id}`] = config.metric2;
      }
      return acc;
    },
    {} as Record<string, string>,
  );

  const bivariateColorSchemes = configs.reduce(
    (acc, config) => {
      if (config.bivariateColorScheme) {
        acc[`bcs_${config.id}`] = config.bivariateColorScheme;
      }
      return acc;
    },
    {} as Record<string, string>,
  );

  const activeFeatures = configs.reduce(
    (acc, config) => {
      if (config.activeFeature) {
        acc[`af_${config.id}`] = config.activeFeature.geoid;
      }
      return acc;
    },
    {} as Record<string, string>,
  );

  return { maps, datasets, metrics, metrics2, bivariateColorSchemes, activeFeatures };
}

export function deserializeMapConfigs(params: URLSearchParams): DeserializedState {
  const layersParam = params.get("layers");
  const pointLayers = layersParam ? layersParam.split(",").filter(Boolean) : [];

  const hazardsParam = params.get("hazards");
  const hazardLayers = hazardsParam ? hazardsParam.split(",").filter(Boolean) : [];

  const rastersParam = params.get("rasters");
  const rasterLayers = rastersParam ? rastersParam.split(",").filter(Boolean) : [];

  const mapsParam = params.get("maps");

  const activeParam = params.get("active") || undefined;

  if (!mapsParam) {
    return {
      mapConfigs: [],
      primaryMapId: activeParam,
      pointLayers,
      hazardLayers,
      rasterLayers,
    };
  }

  const mapConfigs: Partial<MapConfig>[] = mapsParam.split(",").map((mapStr) => {
    const [id, vis] = mapStr.split(":");

    const metric2 = params.get(`m2_${id}`);
    const bivariateColorScheme = params.get(`bcs_${id}`);
    const config: Partial<MapConfig> = {
      id,
      visible: vis === "vis",
      dataset: params.get(`d_${id}`) || "",
      metric: params.get(`m_${id}`) || "",
      ...(metric2 ? { metric2 } : {}),
      ...(bivariateColorScheme ? { bivariateColorScheme } : {}),
    };

    const afParam = params.get(`af_${id}`);
    if (afParam) {
      config.activeFeature = { geoid: afParam, lat: 0, lng: 0, zoom: 0 };
    }

    return config;
  });

  return { mapConfigs, primaryMapId: activeParam, pointLayers, hazardLayers, rasterLayers };
}

export function validateAndNormalize(state: DeserializedState): DeserializedState {
  const { mapConfigs, primaryMapId, pointLayers, hazardLayers, rasterLayers } = state;

  // Validate map configs
  const validMapConfigs = mapConfigs.filter((config) => {
    // Ensure valid map ID format (map1, map2, etc.)
    return config.id && /^map\d+$/.test(config.id);
  });

  // Limit to 4 maps maximum
  const limitedMapConfigs = validMapConfigs.slice(0, 4);

  return {
    mapConfigs: limitedMapConfigs,
    primaryMapId,
    pointLayers,
    hazardLayers,
    rasterLayers,
  };
}
