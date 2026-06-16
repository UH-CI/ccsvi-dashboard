// DEPRECATED — RasterData held decoded GeoTIFF band data (header + IndexedValues Map) produced
// by DataProcessorService and consumed by DataRetreiverService for canvas rendering. Replaced by
// COGInfo (min/max from TiTiler /statistics) stored in useRasterLayersStore. Pending deletion.

export class RasterData {
  private data: {
    header: RasterHeader;
    data: BandData;
  };

  constructor(header: RasterHeader) {
    this.data = {
      header: header,
      data: {},
    };
  }

  combine(
    raster: RasterData,
    renameFunction?: (bandName: string) => string | undefined,
  ): UpdateStatus<FailedBands> {
    let stat: UpdateStatus<FailedBands> = {
      code: UpdateFlags.OK,
      details: { bands: [] },
    };
    const defaultRenameFunction = (bandName: string): string | undefined => {
      return undefined;
    };
    const renameFn = renameFunction || defaultRenameFunction;
    //can only combine if headers are the same (data must be spatially coincident)
    if (this.compareHeader(raster.getHeader()).length == 0) {
      const bands: BandData = {};
      const inBands = raster.getBands();
      let name: string;
      let rename: string | undefined;
      let band: string;
      for (band in inBands) {
        name = band;
        rename = renameFn(band);
        //rename if defined
        if (rename !== undefined && rename !== null) {
          name = rename;
        }
        bands[name] = inBands[band];
      }
      stat = this.addBands(bands);
    } else {
      stat.code |= UpdateFlags.ERROR_HEADER_MISMATCH;
      stat.details = { bands: [] };
    }
    return stat;
  }

  exportRasterAsJSON() {}

  addBand(name: string, values: IndexedValues): UpdateStatus<null> {
    const success = {
      code: UpdateFlags.OK,
      details: null,
    };
    if (this.data.data[name] == undefined) {
      this.data.data[name] = values;
    } else {
      success.code |= UpdateFlags.ERROR_NAME_TAKEN;
    }
    return success;
  }

  addBands(bands: BandData): UpdateStatus<FailedBands> {
    const stat: UpdateStatus<FailedBands> = {
      code: UpdateFlags.OK,
      details: { bands: [] },
    };
    let subStat: UpdateStatus<null>;
    let band: string;
    for (band in bands) {
      subStat = this.addBand(band, bands[band]);
      if (subStat.code != UpdateFlags.OK) {
        stat.code |= UpdateFlags.WARNING_NAME_TAKEN;
        stat.details.bands.push(band);
      }
    }
    return stat;
  }

  verifyIndexRange(values: IndexedValues): boolean {
    let valid = true;
    const maxValue = this.data.header.nRows * this.data.header.nCols;
    const indices = values.keys();
    let pos = indices.next();
    while (!pos.done) {
      if (pos.value >= maxValue) {
        valid = false;
        break;
      }
      pos = indices.next();
    }
    return valid;
  }

  getHeader(): RasterHeader {
    return this.data.header;
  }

  renameBand(oldName: string, newName: string): UpdateStatus<null> {
    const stat = {
      code: UpdateFlags.OK,
      details: null,
    };
    const data = this.data.data[oldName];
    const newValid = this.data.data[newName];
    if (data != undefined && newValid == undefined) {
      this.data.data[newName] = data;
      delete this.data.data[oldName];
    } else {
      if (data == undefined) {
        stat.code |= UpdateFlags.ERROR_INVALID_BAND;
      }
      if (newValid != undefined) {
        stat.code |= UpdateFlags.ERROR_NAME_TAKEN;
      }
    }

    return stat;
  }

  getBandNames(): string[] {
    return Object.keys(this.data.data);
  }

  getBands(bands?: string[]): BandData {
    let data: BandData = {};
    if (bands == undefined) {
      data = this.data.data;
    } else {
      let name: string;
      let i: number;
      for (i = 0; i < bands.length; i++) {
        name = bands[i];
        data[name] = this.data.data[name];
      }
    }
    return data;
  }

  //compare this objects header with the passed header
  //returns array of differing fields
  compareHeader(header: RasterHeader): string[] {
    const diff: string[] = [];
    const header1 = this.data.header;
    if (header1.nCols !== header.nCols) diff.push("nCols");
    if (header1.nRows !== header.nRows) diff.push("nRows");
    if (header1.xllCorner !== header.xllCorner) diff.push("xllCorner");
    if (header1.yllCorner !== header.yllCorner) diff.push("yllCorner");
    if (header1.cellXSize !== header.cellXSize) diff.push("cellXSize");
    if (header1.cellYSize !== header.cellYSize) diff.push("cellYSize");
    return diff;
  }

  updateBand(
    band: string,
    values: IndexedValues,
    updateUndefined: boolean = false,
  ): UpdateStatus<FailedIndices> {
    const status: UpdateStatus<FailedIndices> = {
      code: UpdateFlags.OK,
      details: { indices: [] },
    };
    const data: IndexedValues | undefined = this.data.data[band];
    //need to verify not out of raster range
    const maxValues = this.data.header.nCols * this.data.header.nRows;
    if (data != undefined) {
      values.forEach((value: number, index: number) => {
        if (index < maxValues) {
          //if shouldn't update undefined values, ensure not undefined
          if (updateUndefined || data.get(index) != undefined) {
            data.set(index, value);
          } else {
            //if fail check set code and update failedIndices list
            status.code |= UpdateFlags.WARNING_INVALID_INDEX_UNDEFINED;
            status.details.indices.push(index);
          }
        } else {
          status.code |= UpdateFlags.WARNING_INVALID_INDEX_OOR;
          status.details.indices.push(index);
        }
      });
    } else {
      status.code |= UpdateFlags.ERROR_INVALID_BAND;
      status.details = { indices: [] };
    }

    return status;
  }
}

export interface FailedIndices {
  indices: number[];
}

export interface FailedBands {
  bands: string[];
}

export type IndexedValues = Map<number, number>;

export interface BandData {
  [bandName: string]: IndexedValues;
}

export interface RasterHeader {
  nCols: number;
  nRows: number;
  xllCorner: number;
  yllCorner: number;
  cellXSize: number;
  cellYSize: number;
}

export interface UpdateStatus<T> {
  code: UpdateFlags;
  details: T;
}

export enum UpdateFlags {
  OK = 0,
  WARNING_INVALID_INDEX_OOR = 1,
  WARNING_INVALID_INDEX_UNDEFINED = 1 << 1,
  ERROR_INVALID_BAND = 1 << 2,
  ERROR_NAME_TAKEN = 1 << 3,
  WARNING_NAME_TAKEN = 1 << 4,
  ERROR_HEADER_MISMATCH = 1 << 5,
}
