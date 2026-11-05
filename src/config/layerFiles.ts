interface Switchable {
  off?: boolean;
}

const on = <V>(items: V[]): V[] => items.filter((item) => !(item as Switchable).off);

// A config file's entries without the switched-off ones ("off": true), at both levels: layers and
// their subLayers, or menu categories and their indicators
export function switchedOn<T, K extends keyof T>(items: T[], children: K): T[] {
  return on(items).map((item) => {
    const kids = item[children];
    return Array.isArray(kids) ? { ...item, [children]: on(kids) } : item;
  });
}
