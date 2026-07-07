declare module "geoblaze" {
  const geoblaze: {
    mean: (georaster: unknown, geometry?: unknown) => Promise<number[]>;
    parse: (input: ArrayBuffer | string) => Promise<unknown>;
  };
  export default geoblaze;
}
