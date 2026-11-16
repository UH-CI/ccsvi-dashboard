import menus from "../../config/layers/menus.json";
import { POINT_LAYERS } from "../config/pointLayers";
import { HAZARD_LAYERS } from "../config/hazardLayers";
import { subLayerId } from "../config/layerFiles";
import { RASTER_LAYERS } from "../config/rasterLayers";
import type { HazardLayerConfig, PointLayerConfig, RasterLayerConfig } from "../types";

export type LayerMenuId = "criticalInfrastructure" | "locations" | "hazards";

export interface LayerMenuGroup {
  group: string; // label shown in the menu; unique across all menus
  description?: string; // hover text on the group header
  icon?: string; // react-icons name; falls back to the first layer's icon
  color?: string; // falls back to the first layer's color
  items: string[]; // top-level layer ids, in display order
}

export interface LayerMenu {
  id: LayerMenuId;
  title: string; // button label, popup title and analyzer section title
  popupTitle?: string; // popup title, when it differs from the button label
  description: string; // info-popup text for the button
  hideCheckboxes?: boolean; // rows have no checkbox
  items: (string | LayerMenuGroup)[]; // top-level layer ids and groups, in display order
}

// What each layer menu shows, in config/layers/menus.json; array order is button order and analyzer section order
export const LAYER_MENUS = menus.menus as LayerMenu[];

export type MenuLayer =
  | { kind: "point"; layer: PointLayerConfig }
  | { kind: "shape"; layer: HazardLayerConfig }
  | { kind: "raster"; layer: RasterLayerConfig };
export type MenuGroupEntry = { kind: "group"; group: LayerMenuGroup; layers: MenuLayer[] };
export type MenuEntry = MenuLayer | MenuGroupEntry;
export type LayerKind = MenuLayer["kind"];

// The ids on one map, per kind of layer; a sub-layer is "<id>.<subId>"
export type VisibleIds = Record<LayerKind, ReadonlySet<string>>;

export interface VisibleLeaf {
  kind: "point" | "shape" | "raster";
  key: string; // "<id>", or "<id>.<subId>" for a sub-layer; also the id sent to the API
  label: string; // the layer's own name, or the sub-layer's own name
  icon?: string; // sub-layers have none
  color?: string;
}

// A shape or raster with sub-layers, holding only its visible ones
export interface VisibleParent {
  kind: "parent";
  key: string;
  label: string;
  icon?: string;
  color?: string;
  layerKind: "shape" | "raster";
  subLayers: VisibleLeaf[];
}

export interface VisibleGroup {
  kind: "group";
  label: string;
  icon?: string;
  color?: string;
  children: (VisibleLeaf | VisibleParent)[];
}

export type VisibleNode = VisibleLeaf | VisibleParent | VisibleGroup;

// Every layer by id, with its kind
const LAYERS_BY_ID = new Map<string, MenuLayer>();
for (const layer of POINT_LAYERS) LAYERS_BY_ID.set(layer.id, { kind: "point", layer });
for (const layer of HAZARD_LAYERS) LAYERS_BY_ID.set(layer.id, { kind: "shape", layer });
for (const layer of RASTER_LAYERS) LAYERS_BY_ID.set(layer.id, { kind: "raster", layer });

// Swaps one menu's ids for the layers' configs; the layer file checks (backend/registry.py) make sure every id exists
export function resolveLayerMenu(menu: LayerMenu): MenuEntry[] {
  return menu.items.map((item) =>
    typeof item === "string"
      ? LAYERS_BY_ID.get(item)!
      : { kind: "group", group: item, layers: item.items.map((id) => LAYERS_BY_ID.get(id)!) },
  );
}

function visibleLayerNode(
  entry: MenuLayer,
  visible: VisibleIds,
): VisibleLeaf | VisibleParent | null {
  const visibleIds = visible[entry.kind];
  const { layer } = entry;

  if (entry.kind === "point" || !entry.layer.subLayers?.length) {
    if (!visibleIds.has(layer.id)) return null;
    return {
      kind: entry.kind,
      key: layer.id,
      label: layer.name,
      icon: layer.icon,
      color: layer.color,
    };
  }

  const subLayers: VisibleLeaf[] = entry.layer.subLayers
    .filter((sub) => visibleIds.has(subLayerId(layer.id, sub.id)))
    .map((sub) => ({ kind: entry.kind, key: subLayerId(layer.id, sub.id), label: sub.name }));
  if (subLayers.length === 0) return null;
  return {
    kind: "parent",
    key: layer.id,
    label: layer.name,
    icon: layer.icon,
    color: layer.color,
    layerKind: entry.kind,
    subLayers,
  };
}

// What is visible in one menu, in menu order, keeping its groups and parents
export function visibleMenuTree(entries: MenuEntry[], visible: VisibleIds): VisibleNode[] {
  const nodes: VisibleNode[] = [];
  for (const entry of entries) {
    if (entry.kind !== "group") {
      const node = visibleLayerNode(entry, visible);
      if (node) nodes.push(node);
      continue;
    }
    const children = entry.layers
      .map((layer) => visibleLayerNode(layer, visible))
      .filter((node): node is VisibleLeaf | VisibleParent => node !== null);
    if (children.length === 0) continue;
    nodes.push({
      kind: "group",
      label: entry.group.group,
      icon: entry.group.icon ?? entry.layers[0].layer.icon,
      color: entry.group.color ?? entry.layers[0].layer.color,
      children,
    });
  }
  return nodes;
}

// The visible layers as one list, for the Filter request and the table. A parent's own key is
// never included, only its visible sub-layers, labelled "Parent — Sub".
export function flattenVisibleLayers(nodes: VisibleNode[]): VisibleLeaf[] {
  return nodes.flatMap((node) => {
    if (node.kind === "group") return flattenVisibleLayers(node.children);
    if (node.kind === "parent") {
      return node.subLayers.map((sub) => ({ ...sub, label: `${node.label} — ${sub.label}` }));
    }
    return [node];
  });
}
