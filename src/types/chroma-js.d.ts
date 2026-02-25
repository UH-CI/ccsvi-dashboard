declare module "chroma-js" {
  export interface ChromaStatic {
    scale(colors: string[] | number[][]): ChromaScale;
  }

  export interface ChromaScale {
    domain(range: [number, number]): ChromaScale;
    correctLightness(): ChromaScale;
    (value: number): ChromaColor;
    reverse(): ChromaScale;
  }

  export interface ChromaColor {
    rgba(): [number, number, number, number];
    _rgb: [number, number, number, number];
  }

  const chroma: ChromaStatic;
  export default chroma;
}
