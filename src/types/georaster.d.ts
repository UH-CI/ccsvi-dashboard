declare module "georaster" {
  const parseGeoraster: (input: ArrayBuffer | Uint8Array | any) => Promise<any>;
  export default parseGeoraster;
}

declare module "georaster-layer-for-leaflet" {
  const GeoRasterLayer: any;
  export default GeoRasterLayer;
}
