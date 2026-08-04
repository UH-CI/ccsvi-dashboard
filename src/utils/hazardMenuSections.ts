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
  const sorted = configs
    .map((layer, index) => ({ layer, index }))
    .filter(({ layer }) => (layer.menuPanel ?? "hazards") === panel);

  const sections: HazardMenuSection[] = [];

  for (const { layer } of sorted) {
    if (layer.menuGroup) {
      const last = sections[sections.length - 1];
      if (last?.kind === "group" && last.label === layer.menuGroup) {
        last.layers.push(layer);
      } else {
        sections.push({ kind: "group", label: layer.menuGroup, layers: [layer] });
      }
    } else {
      sections.push({ kind: "layer", layer });
    }
  }

  return sections;
}
