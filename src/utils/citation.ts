import type { LayerFileMetadata, LayerMetadata } from "../types";

// One source as the citations page lists it: the names on screen that use it, and its metadata
export interface Source {
  names: string[];
  metadata: LayerMetadata;
}

interface SourceLayer {
  name: string;
  metadata?: LayerFileMetadata;
  subLayers?: { name: string; metadata?: LayerFileMetadata }[];
}

// The sources of a list of layers: one per sub-layer that has its own metadata (laid over its layer's,
// named "<layer>: <sub-layer>"), else one for the layer; a layer without metadata has none
export function layerSources(layers: SourceLayer[]): Source[] {
  return layers.flatMap((layer) => {
    const subs = (layer.subLayers ?? []).filter((sub) => sub.metadata);
    if (subs.length > 0) {
      return subs.map((sub) => ({
        names: [`${layer.name}: ${sub.name}`],
        metadata: { ...layer.metadata, ...sub.metadata } as LayerMetadata,
      }));
    }
    return layer.metadata
      ? [{ names: [layer.name], metadata: layer.metadata as LayerMetadata }]
      : [];
  });
}

// Sources with the same metadata listed once, with every name that uses it, in first-seen order
export function mergeSameSources(sources: Source[]): Source[] {
  const byMetadata = new Map<string, Source>();
  for (const source of sources) {
    const key = JSON.stringify(Object.entries(source.metadata).sort());
    const seen = byMetadata.get(key);
    if (seen) seen.names.push(...source.names);
    else byMetadata.set(key, { names: [...source.names], metadata: source.metadata });
  }
  return [...byMetadata.values()];
}

// The short source line: the first author ("et al." when there are more), the title and the period
export function shortCitation(metadata: LayerMetadata): string {
  const [first, ...others] = metadata.author.split("; ");
  return `${first}${others.length > 0 ? " et al." : ""}, "${metadata.title}," ${metadata.period}`;
}
