// DEPRECATED — ColorScale and Color supported the client-side GeoTIFF decode → canvas render
// pipeline via color-generator.service.ts and leaflet-raster-layer.service.ts. Replaced by
// TiTiler PNG tiles (rendering) and /api/v1/rasters/colormap (legend). Pending deletion.

export interface Color {
  r: number;
  g: number;
  b: number;
  a: number;
}

export class ColorScale {
  private colors: Color[];
  private hexColors: string[];
  private range: [number, number];

  //scale allows for different scalings to be introduced, e.g. for an exponential scaling, should return value squared
  constructor(colorFunct: (value: number) => Color, range: [number, number], numColors: number) {
    this.colors = [];
    this.hexColors = [];
    this.range = range;

    const span = range[1] - range[0];
    const interval = span / numColors;
    let value: number;
    let i: number;
    for (i = 0, value = range[0]; i < numColors; i++, value += interval) {
      const color = colorFunct(value);
      // for(let channel in color) {
      //   color[channel] = Math.round(color[channel]);
      // }
      for (const channel of Object.keys(color) as (keyof Color)[]) {
        color[channel] = Math.round(color[channel]);
      }
      const r = color.r.toString(16).padStart(2, "0");
      const g = color.g.toString(16).padStart(2, "0");
      const b = color.b.toString(16).padStart(2, "0");
      const cstring = `#${r}${g}${b}`;
      this.hexColors.push(cstring);
      this.colors.push(color);
    }
  }

  getColor(value: number): Color {
    const index = this.getColorIndex(value);
    const color = this.colors[index];
    return color;
  }

  getColorHex(value: number): string {
    const index = this.getColorIndex(value);
    const hex = this.hexColors[index];
    return hex;
  }

  private getColorIndex(value: number): number {
    const span = this.range[1] - this.range[0];

    let offset: number;
    //if beyond range then scale to extrema
    if (value < this.range[0]) {
      offset = 0;
    } else if (value > this.range[1]) {
      offset = span;
    }
    //otherwise scale as offset
    else {
      offset = value - this.range[0];
    }

    const values = this.colors.length;

    //get scale of offset (0-1)
    const scale = offset / span;
    //get position in value array scale
    const pos = scale * (values - 1);
    //get nearest index
    const index = Math.round(pos);
    return index;
  }

  getRange(): [number, number] {
    return this.range;
  }

  getColors(): Color[] {
    return [...this.colors];
  }

  getColorsHex(): string[] {
    return [...this.hexColors];
  }
}
