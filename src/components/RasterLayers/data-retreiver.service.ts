import { LatLng, LatLngBounds } from "leaflet";
import { ColorScale, Color } from './colorScale';
import { RasterHeader, IndexedValues } from "./RasterData";
import { Feature, Polygon } from 'geojson';


export class DataRetreiverService {
  constructor() {
  }

  tileXYToFlat(x: number, y: number, tileSize: { x: number; y: number }): number {
    return y * tileSize.x + x;
  }

  flattenGridCoords(header: RasterHeader, coords: DecoupledCoords): number {
    return header.nCols * coords.y + coords.x
  }

  decoupleGridIndex(header: RasterHeader, index: number): DecoupledCoords {
    return {
      x: index % header.nCols,
      y: Math.floor(index / header.nCols)
    }
  }

  offsetPosByLL(header: RasterHeader, pos: LatLng): LatLng {
    return new LatLng(pos.lat - header.yllCorner, pos.lng - header.xllCorner);
  }

  //need to ensure in grid range,
  geoPosToGridCoords(header: RasterHeader, pos: LatLng): DecoupledCoords | null {
    let offset = this.offsetPosByLL(header, pos);
    let coords: DecoupledCoords | null = null;
    let x = Math.floor(offset.lng / header.cellXSize);
    //check if in grid range, if not return null (otherwise will provide erroneous results when flattened)
    if(x >= 0 && x < header.nCols) {
      let y = Math.floor(header.nRows - offset.lat / header.cellYSize);
      //check range
      if(y >= 0 && y < header.nRows) {
        coords = {
          x: x,
          y: y
        };
      }
    }
    return coords;
  }

  geoPosToGridIndex(header: RasterHeader, pos: LatLng): number | null {
    let index = null;
    let coords = this.geoPosToGridCoords(header, pos);
    if(coords != null) {
      index = this.flattenGridCoords(header, coords);
    }
    return index;
  }

  geoPosToGridValue(header: RasterHeader, data: IndexedValues, pos: LatLng): number | undefined {
    let index = this.geoPosToGridIndex(header, pos);
    if (index === null) {
      return undefined;
    }
    return data.get(index);
  }

  geoPosToColor(header: RasterHeader, data: IndexedValues, pos: LatLng, colorScale: ColorScale): Color | undefined {
    const value = this.geoPosToGridValue(header, data, pos);
    if (value === undefined || !colorScale) {
      return undefined;
    }
    return colorScale.getColor(value);
  }

  //if !getNoValue just return null if the cell is background
  getCellBoundsFromGeoPos(header: RasterHeader, data: IndexedValues, pos: LatLng, getNoValue: boolean = false): LatLngBounds | null {
    let bounds: LatLngBounds | null = null;
    //just start from here instead of using geoPosToGridValue to prevent need to recompute location
    let coords = this.geoPosToGridCoords(header, pos);
    //check if bounds in grid
    if(coords != null) {
      //check if value at location if !getNoValue
      let valid = true;
      if(!getNoValue) {
        let index = this.flattenGridCoords(header, coords);
        if(data.get(index) == undefined) {
          valid = false;
        }
      }
      if(valid) {
        let lx = header.xllCorner + header.cellXSize * coords.x;
        let uy = header.yllCorner + header.cellYSize * (header.nRows - coords.y);
        //counterclockwise
        let ll = new LatLng(uy - header.cellYSize, lx);
        let ur = new LatLng(uy, lx + header.cellXSize);
        bounds = new LatLngBounds(ll, ur);
      }

    }
    return bounds;
  }

  //if no value at cell or out of bounds returns null
  //geojson uses long, lat
  //geojson counterclockwise
  getGeoJSONCellFromGeoPos(header: RasterHeader, data: IndexedValues, pos: LatLng, getNoValue: boolean = false): Feature<Polygon> | null {
    let geojson: Feature<Polygon> | null = null;
    let bounds = this.getCellBoundsFromGeoPos(header, data, pos, getNoValue);

    if(bounds != null) {
      geojson = this.getGeoJSONCellFromBounds(bounds);
    }
    return geojson;
  }

  getGeoJSONCellFromBounds(bounds: LatLngBounds): Feature<Polygon> {
    let n = bounds.getNorth();
    let e = bounds.getEast();
    let s = bounds.getSouth();
    let w = bounds.getWest();
    let geojson: Feature<Polygon> = {
      type: "Feature",
      geometry: {
        type: "Polygon",
        coordinates: [[
          [w, s],
          [e, s],
          [e, n],
          [w, n],
          [w, s]
        ]]
      },
      properties: {}
    };
    return geojson;
  }
  

  getBoundsWidthHeight(bounds: LatLngBounds) {
    let ll = bounds.getSouthWest();
    let ul = bounds.getNorthWest();
    let lr = bounds.getSouthEast();
    let xm = this.getDistance(ll, lr);
    let ym = this.getDistance(ul, ll);
    return {
      width: xm,
      height: ym
    };
  }

  getDistance(p1: LatLng, p2: LatLng): number {
    //radius of earth in km
    const r = 6378.137;
    let dLat = p2.lat * Math.PI / 180 - p1.lat * Math.PI / 180;
    let dLon = p2.lng * Math.PI / 180 - p1.lng * Math.PI / 180;
    let a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    let d = r * c;
    //km to meters
    let m = d * 1000;
    return m;
  }
}

export interface BBox {
  ll: LatLng,
  lr: LatLng,
  ur: LatLng,
  ul: LatLng
}

export interface GridBBox {
  ll: DecoupledCoords,
  lr: DecoupledCoords,
  ur: DecoupledCoords,
  ul: DecoupledCoords
}

export interface DecoupledCoords {
  x: number,
  y: number
}