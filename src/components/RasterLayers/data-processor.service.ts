import { RasterData, IndexedValues, UpdateFlags } from "./RasterData";

// Import worker using Vite's worker syntax
import GeoTiffWorker from "./geotiff.worker?worker";

export class DataProcessorService {
  private static workerInstance: Worker | null = null;

  static getWorker(): Worker {
    if (!DataProcessorService.workerInstance) {
      DataProcessorService.workerInstance = new GeoTiffWorker();
    }
    return DataProcessorService.workerInstance;
  }

  // private resolver: (value: RasterData | PromiseLike<RasterData>) => void;
  // private workerId: number;
  // private lastReceivedId: number;
  // private message: {
  //   id: number,
  //   buffer: ArrayBuffer,
  //   customNoData?: number,
  //   bands?: string[]
  // } | null = null;

  private resolver: ((value: RasterData | null) => void) | null = null;
  private workerId: number = 0;
  private lastReceivedId: number = 0;
  private message: {
    id: number;
    buffer: ArrayBuffer;
    customNoData?: number;
    bands?: number[];
    sampleRate?: number;
    overviewIndex?: number;
  } | null = null;

  constructor() {
    const worker = DataProcessorService.getWorker();
    worker.onmessage = ({ data }) => {
      //let { header, bandData, id } = data;
      const { header, bandData, id } = data;
      this.lastReceivedId = id;
      //if this is the data for the last request submitted then process and resolve
      if (this.workerId === id) {
        if (this.resolver)
          if (header === null) {
            this.resolver(null);
          } else {
            const geotiffData: RasterData = new RasterData(header);
            for (const band in bandData) {
              // Build Map incrementally to avoid "Map maximum size exceeded" error
              // Don't use Map constructor with large arrays - it can fail with >16M entries
              const values: IndexedValues = new Map<number, number>();
              const bandArray = bandData[band];

              if (!bandArray || bandArray.length === 0) {
                console.warn(`No data for band ${band}`);
                continue;
              }

              // Add entries in batches to avoid memory issues and Map size limits
              const batchSize = 50000; // Process 50k entries at a time
              const maxEntries = 10000000; // Safety limit: 10M entries max

              for (let i = 0; i < Math.min(bandArray.length, maxEntries); i += batchSize) {
                const batch = bandArray.slice(
                  i,
                  Math.min(i + batchSize, bandArray.length, maxEntries),
                );
                for (const entry of batch) {
                  if (entry && entry.length === 2) {
                    values.set(entry[0], entry[1]);
                  }
                }

                // Safety check: if Map is getting too large, stop
                if (values.size >= maxEntries) {
                  console.warn(
                    `Map size limit reached for band ${band}, stopping at ${values.size} entries`,
                  );
                  break;
                }
              }

              console.log(`Created Map for band ${band} with ${values.size} entries`);

              const rasterStat = geotiffData.addBand(band, values);
              if (rasterStat.code != UpdateFlags.OK) {
                throw new Error("Error adding band to raster: " + band);
              }
            }
            this.resolver(geotiffData);
          }
        this.resolver = null;
      }
      //otherwise submit latest request data to worker
      else {
        worker.postMessage(this.message);
      }
    };
  }

  //need custom no data for now since geotiffs appear to have rounding error
  // sampleRate: 1 = no sampling, 2 = every 2nd pixel, etc. (for very large files)
  // overviewIndex: 0 = full resolution, 1+ = overview levels (for faster loading)
  getRasterDataFromGeoTIFFArrayBuffer(
    data: ArrayBuffer,
    customNoData?: number,
    bands?: number[],
    sampleRate?: number,
    overviewIndex?: number,
  ): Promise<RasterData | null> {
    return new Promise((resolve) => {
      if (this.resolver) {
        this.resolver(null);
      }
      this.resolver = resolve;
      const workerId = this.workerId + 1;
      this.message = {
        id: workerId,
        buffer: data,
        customNoData,
        bands: bands || [0], // Default to first band
        sampleRate: sampleRate || 1,
        overviewIndex: overviewIndex,
      };
      //if the last worker dispatched is the last request then immeddiately post message, otherwise push after current outbound worker returns to prevent a backup of messages
      const worker = DataProcessorService.getWorker();
      if (this.workerId == this.lastReceivedId) {
        worker.postMessage(this.message);
      }
      this.workerId = workerId;
    });
  }
}
