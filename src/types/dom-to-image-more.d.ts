declare module 'dom-to-image-more' {
    interface Options {
        filter?: (node: HTMLElement) => boolean;
        bgcolor?: string;
        width?: number;
        height?: number;
        style?: Partial<CSSStyleDeclaration>;
        quality?: number;
        imagePlaceholder?: string;
        cacheBust?: boolean;
    }

    interface DomToImage {
        toPng(node: HTMLElement, options?: Options): Promise<string>;
        toJpeg(node: HTMLElement, options?: Options): Promise<string>;
        toSvg(node: HTMLElement, options?: Options): Promise<string>;
        toPixelData(node: HTMLElement, options?: Options): Promise<Uint8ClampedArray>;
        toCanvas(node: HTMLElement, options?: Options): Promise<HTMLCanvasElement>;
        toBlob(node: HTMLElement, options?: Options): Promise<Blob>;
    }

    const domToImage: DomToImage;
    export default domToImage;
}