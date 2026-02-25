import { LatLng, LatLngBounds } from "leaflet";
import { ColorScale, Color } from "./colorScale";
import { RasterHeader, IndexedValues } from "./RasterData";
import { Feature, Polygon } from "geojson";

export class DataRetreiverService {
  constructor() {}

  tileXYToFlat(x: number, y: number, tileSize: { x: number; y: number }): number {
    return y * tileSize.x + x;
  }

  flattenGridCoords(header: RasterHeader, coords: DecoupledCoords): number {
    return header.nCols * coords.y + coords.x;
  }

  decoupleGridIndex(header: RasterHeader, index: number): DecoupledCoords {
    return {
      x: index % header.nCols,
      y: Math.floor(index / header.nCols),
    };
  }

  offsetPosByLL(header: RasterHeader, pos: LatLng): LatLng {
    return new LatLng(pos.lat - header.yllCorner, pos.lng - header.xllCorner);
  }

  //need to ensure in grid range,
  geoPosToGridCoords(header: RasterHeader, pos: LatLng): DecoupledCoords | null {
    const offset = this.offsetPosByLL(header, pos);
    let coords: DecoupledCoords | null = null;
    const x = Math.floor(offset.lng / header.cellXSize);
    //check if in grid range, if not return null (otherwise will provide erroneous results when flattened)
    if (x >= 0 && x < header.nCols) {
      const y = Math.floor(header.nRows - offset.lat / header.cellYSize);
      //check range
      if (y >= 0 && y < header.nRows) {
        coords = {
          x: x,
          y: y,
        };
      }
    }
    return coords;
  }

  geoPosToGridIndex(header: RasterHeader, pos: LatLng): number | null {
    let index = null;
    const coords = this.geoPosToGridCoords(header, pos);
    if (coords != null) {
      index = this.flattenGridCoords(header, coords);
    }
    return index;
  }

  geoPosToGridValue(header: RasterHeader, data: IndexedValues, pos: LatLng): number | undefined {
    const index = this.geoPosToGridIndex(header, pos);
    if (index === null) {
      return undefined;
    }
    return data.get(index);
  }

  geoPosToColor(
    header: RasterHeader,
    data: IndexedValues,
    pos: LatLng,
    colorScale: ColorScale,
  ): Color | undefined {
    const value = this.geoPosToGridValue(header, data, pos);
    if (value === undefined || !colorScale) {
      return undefined;
    }
    return colorScale.getColor(value);
  }

  //if !getNoValue just return null if the cell is background
  getCellBoundsFromGeoPos(
    header: RasterHeader,
    data: IndexedValues,
    pos: LatLng,
    getNoValue: boolean = false,
  ): LatLngBounds | null {
    let bounds: LatLngBounds | null = null;
    //just start from here instead of using geoPosToGridValue to prevent need to recompute location
    const coords = this.geoPosToGridCoords(header, pos);
    //check if bounds in grid
    if (coords != null) {
      //check if value at location if !getNoValue
      let valid = true;
      if (!getNoValue) {
        const index = this.flattenGridCoords(header, coords);
        if (data.get(index) == undefined) {
          valid = false;
        }
      }
      if (valid) {
        const lx = header.xllCorner + header.cellXSize * coords.x;
        const uy = header.yllCorner + header.cellYSize * (header.nRows - coords.y);
        //counterclockwise
        const ll = new LatLng(uy - header.cellYSize, lx);
        const ur = new LatLng(uy, lx + header.cellXSize);
        bounds = new LatLngBounds(ll, ur);
      }
    }
    return bounds;
  }

  //if no value at cell or out of bounds returns null
  //geojson uses long, lat
  //geojson counterclockwise
  getGeoJSONCellFromGeoPos(
    header: RasterHeader,
    data: IndexedValues,
    pos: LatLng,
    getNoValue: boolean = false,
  ): Feature<Polygon> | null {
    let geojson: Feature<Polygon> | null = null;
    const bounds = this.getCellBoundsFromGeoPos(header, data, pos, getNoValue);

    if (bounds != null) {
      geojson = this.getGeoJSONCellFromBounds(bounds);
    }
    return geojson;
  }

  getGeoJSONCellFromBounds(bounds: LatLngBounds): Feature<Polygon> {
    const n = bounds.getNorth();
    const e = bounds.getEast();
    const s = bounds.getSouth();
    const w = bounds.getWest();
    const geojson: Feature<Polygon> = {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [w, s],
            [e, s],
            [e, n],
            [w, n],
            [w, s],
          ],
        ],
      },
      properties: {},
    };
    return geojson;
  }

  getBoundsWidthHeight(bounds: LatLngBounds) {
    const ll = bounds.getSouthWest();
    const ul = bounds.getNorthWest();
    const lr = bounds.getSouthEast();
    const xm = this.getDistance(ll, lr);
    const ym = this.getDistance(ul, ll);
    return {
      width: xm,
      height: ym,
    };
  }

  getDistance(p1: LatLng, p2: LatLng): number {
    //radius of earth in km
    const r = 6378.137;
    const dLat = (p2.lat * Math.PI) / 180 - (p1.lat * Math.PI) / 180;
    const dLon = (p2.lng * Math.PI) / 180 - (p1.lng * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((p1.lat * Math.PI) / 180) *
        Math.cos((p2.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = r * c;
    //km to meters
    const m = d * 1000;
    return m;
  }
}

export interface BBox {
  ll: LatLng;
  lr: LatLng;
  ur: LatLng;
  ul: LatLng;
}

export interface GridBBox {
  ll: DecoupledCoords;
  lr: DecoupledCoords;
  ur: DecoupledCoords;
  ul: DecoupledCoords;
}

export interface DecoupledCoords {
  x: number;
  y: number;
}
