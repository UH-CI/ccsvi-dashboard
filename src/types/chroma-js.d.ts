declare module "chroma-js" {
  export interface ChromaStatic {
    scale(colors: string[] | number[][]): ChromaScale;
  }

  export interface ChromaScale {
    domain(range: [number, number] | number[]): ChromaScale;
    mode(mode: string): ChromaScale;
    correctLightness(): ChromaScale;
    (value: number): ChromaColor;
    reverse(): ChromaScale;
  }

  export interface ChromaColor {
    alpha(a: number): ChromaColor;
    css(): string;
    rgba(): [number, number, number, number];
    _rgb: [number, number, number, number];
  }

  const chroma: ChromaStatic;
  export default chroma;
}
