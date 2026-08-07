import type { HazardLayerConfig } from "../types";

export type HazardMenuSection =
  | { kind: "layer"; layer: HazardLayerConfig }
  | { kind: "group"; label: string; layers: HazardLayerConfig[] };

export function hazardMenuGroupExpandKey(label: string): string {
  return `__group__${label}`;
}


export function buildHazardMenuSections(
  configs: HazardLayerConfig[],
  panel: HazardLayerConfig["menuPanel"] = "hazards",
): HazardMenuSection[] {
  const filtered = configs.filter((layer) => (layer.menuPanel ?? "hazards") === panel);

  const sections: HazardMenuSection[] = [];
  const groupsByLabel = new Map<string, Extract<HazardMenuSection, { kind: "group" }>>();

  for (const layer of filtered) {
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
