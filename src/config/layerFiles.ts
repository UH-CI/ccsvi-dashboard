interface Switchable {
  off?: boolean;
  subLayers?: { off?: boolean }[];
}

// A layer file's entries without the switched-off ones ("off": true), at both levels
export function switchedOn<T extends Switchable>(layers: T[]): T[] {
  return layers
    .filter((layer) => !layer.off)
    .map((layer) =>
      layer.subLayers
        ? ({ ...layer, subLayers: layer.subLayers.filter((sub) => !sub.off) } as T)
        : layer,
    );
}
