import L from "leaflet";

// What a layer does with a click: null when the click isn't on it; otherwise the popup's HTML, or a
// promise of it (null for no popup)
export type ClickTarget = (latlng: L.LatLng) => string | Promise<string | null> | null;

// Hazards are drawn above rasters, so they're asked first
export const CLICK_ORDER = { hazard: 0, raster: 1 } as const;

interface MapClicks {
  targets: { order: number; target: ClickTarget }[];
  listener: (e: MouseEvent) => void;
  popup: L.Popup | null;
  // The layer whose popup is open or on its way
  owner: ClickTarget | null;
  // Counts clicks, so a popup that arrives after a later click is dropped
  click: number;
}

const clicksByMap = new WeakMap<L.Map, MapClicks>();

function closePopup(clicks: MapClicks) {
  clicks.popup?.remove();
  clicks.popup = null;
  clicks.owner = null;
  clicks.click++;
}

// Asks each layer in order; the first that says the click is its own gets it, before Leaflet does.
// Markers are drawn above every layer, and a click inside a popup is the popup's.
function handleClick(map: L.Map, clicks: MapClicks, e: MouseEvent) {
  if ((e.target as HTMLElement).closest(".leaflet-marker-icon, .leaflet-popup")) return;
  const latlng = map.mouseEventToLatLng(e);
  for (const { target } of clicks.targets) {
    const answer = target(latlng);
    if (answer === null) continue;
    e.stopImmediatePropagation();
    closePopup(clicks);
    clicks.owner = target;
    const click = clicks.click;
    void Promise.resolve(answer).then((html) => {
      if (html === null || clicks.click !== click) return;
      clicks.popup = L.popup().setLatLng(latlng).setContent(html).openOn(map);
    });
    return;
  }
}

// Adds a layer's click test to its map; returns a function that removes it and closes any popup it opened
export function addClickTarget(map: L.Map, order: number, target: ClickTarget): () => void {
  let clicks = clicksByMap.get(map);
  if (!clicks) {
    const created: MapClicks = {
      targets: [],
      listener: (e) => handleClick(map, created, e),
      popup: null,
      owner: null,
      click: 0,
    };
    map.getContainer().addEventListener("click", created.listener, true);
    clicksByMap.set(map, created);
    clicks = created;
  }
  const mapClicks = clicks;
  // A stable sort, so layers with the same order are asked in the order they were added
  mapClicks.targets = [...mapClicks.targets, { order, target }].sort((a, b) => a.order - b.order);

  return () => {
    mapClicks.targets = mapClicks.targets.filter((each) => each.target !== target);
    if (mapClicks.owner === target) closePopup(mapClicks);
    if (mapClicks.targets.length === 0) {
      map.getContainer().removeEventListener("click", mapClicks.listener, true);
      clicksByMap.delete(map);
    }
  };
}
