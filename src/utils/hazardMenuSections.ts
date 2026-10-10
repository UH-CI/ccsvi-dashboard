import type { HazardLayerConfig } from "../types";

export type MenuSection<T> =
  { kind: "layer"; layer: T } | { kind: "group"; label: string; layers: T[] };

export type HazardMenuSection = MenuSection<HazardLayerConfig>;

export function hazardMenuGroupExpandKey(label: string): string {
  return `__group__${label}`;
}

export function buildHazardMenuSections(
  configs: HazardLayerConfig[],
  panel: HazardLayerConfig["menuPanel"] = "hazards",
): HazardMenuSection[] {
  return buildMenuSections(configs.filter((layer) => (layer.menuPanel ?? "hazards") === panel));
}

// Layers sharing a menuGroup become one group section, placed where the first of them appears
export function buildMenuSections<T extends { menuGroup?: string }>(layers: T[]): MenuSection<T>[] {
  const sections: MenuSection<T>[] = [];
  const groupsByLabel = new Map<string, Extract<MenuSection<T>, { kind: "group" }>>();

  for (const layer of layers) {
    if (layer.menuGroup) {
      let group = groupsByLabel.get(layer.menuGroup);
      if (!group) {
        group = { kind: "group", label: layer.menuGroup, layers: [] };
        groupsByLabel.set(layer.menuGroup, group);
        sections.push(group);
      }
      group.layers.push(layer);
    } else {
      sections.push({ kind: "layer", layer });
    }
  }

  return sections;
}
