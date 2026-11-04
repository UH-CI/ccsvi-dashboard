import { LAYER_MENUS } from "../config/layerMenus";
import type { LayerMenu, LayerMenuGroup } from "../config/layerMenus";
import { POINT_LAYERS } from "../config/pointLayers";
import { HAZARD_LAYERS } from "../config/hazardLayers";
import { RASTER_LAYERS } from "../config/rasterLayers";
import type { HazardLayerConfig, PointLayerConfig, RasterLayerConfig } from "../types";

export type MenuLayer =
  | { kind: "point"; layer: PointLayerConfig }
  | { kind: "shape"; layer: HazardLayerConfig }
  | { kind: "raster"; layer: RasterLayerConfig };
export type MenuGroupEntry = { kind: "group"; group: LayerMenuGroup; layers: MenuLayer[] };
export type MenuEntry = MenuLayer | MenuGroupEntry;

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

function findLayer(
  id: string,
  points: PointLayerConfig[],
  shapes: HazardLayerConfig[],
  rasters: RasterLayerConfig[],
): MenuLayer | null {
  const point = points.find((layer) => layer.id === id);
  if (point) return { kind: "point", layer: point };
  const shape = shapes.find((layer) => layer.id === id);
  if (shape) return { kind: "shape", layer: shape };
  const raster = rasters.find((layer) => layer.id === id);
  if (raster) return { kind: "raster", layer: raster };
  return null;
}

// Swaps one menu's ids for the layers' configs, taken from the stores. An id with no config is
// skipped: that only happens to rasters before their store has loaded, since checkLayerMenus
// makes sure every id exists.
export function resolveLayerMenu(
  menu: LayerMenu,
  points: PointLayerConfig[],
  shapes: HazardLayerConfig[],
  rasters: RasterLayerConfig[],
): MenuEntry[] {
  const entries: MenuEntry[] = [];
  for (const item of menu.items) {
    if (typeof item === "string") {
      const layer = findLayer(item, points, shapes, rasters);
      if (layer) entries.push(layer);
      continue;
    }
    const layers = item.items
      .map((id) => findLayer(id, points, shapes, rasters))
      .filter((layer): layer is MenuLayer => layer !== null);
    if (layers.length > 0) entries.push({ kind: "group", group: item, layers });
  }
  return entries;
}

function visibleLayerNode(
  entry: MenuLayer,
  visiblePointIds: ReadonlySet<string> | undefined,
  visibleShapeIds: ReadonlySet<string> | undefined,
  visibleRasterIds: ReadonlySet<string> | undefined,
): VisibleLeaf | VisibleParent | null {
  const visibleIds =
    entry.kind === "point"
      ? visiblePointIds
      : entry.kind === "shape"
        ? visibleShapeIds
        : visibleRasterIds;
  const { layer } = entry;

  if (entry.kind === "point" || !entry.layer.subLayers?.length) {
    if (!visibleIds?.has(layer.id)) return null;
    return {
      kind: entry.kind,
      key: layer.id,
      label: layer.name,
      icon: layer.icon,
      color: layer.color,
    };
  }

  const subLayers: VisibleLeaf[] = entry.layer.subLayers
    .filter((sub) => visibleIds?.has(`${layer.id}.${sub.id}`))
    .map((sub) => ({ kind: entry.kind, key: `${layer.id}.${sub.id}`, label: sub.name }));
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
export function visibleMenuTree(
  entries: MenuEntry[],
  visiblePointIds: ReadonlySet<string> | undefined,
  visibleShapeIds: ReadonlySet<string> | undefined,
  visibleRasterIds: ReadonlySet<string> | undefined,
): VisibleNode[] {
  const nodes: VisibleNode[] = [];
  for (const entry of entries) {
    if (entry.kind !== "group") {
      const node = visibleLayerNode(entry, visiblePointIds, visibleShapeIds, visibleRasterIds);
      if (node) nodes.push(node);
      continue;
    }
    const children = entry.layers
      .map((layer) => visibleLayerNode(layer, visiblePointIds, visibleShapeIds, visibleRasterIds))
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

// Stops the app with every problem in src/config/layerMenus.ts at once. Runs when this file loads.
function checkLayerMenus(): void {
  const problems: string[] = [];

  const kindsById = new Map<string, string[]>();
  const configLists = [
    ["point", POINT_LAYERS],
    ["shape", HAZARD_LAYERS],
    ["raster", RASTER_LAYERS],
  ] as const;
  for (const [kind, layers] of configLists) {
    for (const layer of layers) kindsById.set(layer.id, [...(kindsById.get(layer.id) ?? []), kind]);
  }
  for (const [id, kinds] of kindsById) {
    if (kinds.length > 1)
      problems.push(
        `Layer id "${id}" is used by more than one kind of layer (${kinds.join(", ")})`,
      );
  }

  const timesListed = new Map<string, number>();
  const menuIds = new Set<string>();
  const groupLabels = new Set<string>();
  for (const menu of LAYER_MENUS) {
    if (menuIds.has(menu.id)) problems.push(`Menu id "${menu.id}" is used twice`);
    menuIds.add(menu.id);
    for (const item of menu.items) {
      if (typeof item !== "string") {
        if (groupLabels.has(item.group)) problems.push(`Group "${item.group}" is used twice`);
        groupLabels.add(item.group);
        if (item.items.length === 0) problems.push(`Group "${item.group}" has no layers`);
      }
      for (const id of typeof item === "string" ? [item] : item.items) {
        timesListed.set(id, (timesListed.get(id) ?? 0) + 1);
      }
    }
  }
  for (const [id, count] of timesListed) {
    if (!kindsById.has(id)) problems.push(`"${id}" is listed, but no layer config has that id`);
    if (count > 1) problems.push(`"${id}" is listed ${count} times`);
  }
  for (const id of kindsById.keys()) {
    if (!timesListed.has(id)) problems.push(`Layer "${id}" is in no menu`);
  }

  if (problems.length > 0) {
    throw new Error(`Problems in src/config/layerMenus.ts:\n- ${problems.join("\n- ")}`);
  }
}

checkLayerMenus();
