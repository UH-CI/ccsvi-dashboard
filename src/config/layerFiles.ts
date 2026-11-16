interface Switchable {
  off?: boolean;
}

// A list without its switched-off entries ("off": true), one level only
export const on = <V>(items: V[]): V[] => items.filter((item) => !(item as Switchable).off);

// A sub-layer's id: "<parent>.<sub>"
export const subLayerId = (parentId: string, subId: string) => `${parentId}.${subId}`;

// A layer id split into its parent and, for a sub-layer, the sub-layer; parent ids never contain a dot
export function splitLayerId(id: string): [string, string | undefined] {
  const dot = id.indexOf(".");
  return dot === -1 ? [id, undefined] : [id.slice(0, dot), id.slice(dot + 1)];
}

// A config file's entries without the switched-off ones ("off": true), at both levels: layers and
// their subLayers, or menu categories and their indicators
export function switchedOn<T, K extends keyof T>(items: T[], children: K): T[] {
  return on(items).map((item) => {
    const kids = item[children];
    return Array.isArray(kids) ? { ...item, [children]: on(kids) } : item;
  });
}
