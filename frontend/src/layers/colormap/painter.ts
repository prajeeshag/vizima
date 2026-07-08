import { type Painter } from "../../core/painter";
import { PixelField } from "../../data/pixel-field";
import { logger } from "../../logger";
import * as d3 from "d3";
import { createColorScale, type ColorScaleStatic } from "./colorscale";
import { WebGLColormapContext } from "./webgl-context";

const ALPHA = 0.85;

const webglCtxRegistry = new WeakMap<HTMLCanvasElement, WebGLColormapContext>();

function getWebGLContext(canvas: HTMLCanvasElement): WebGLColormapContext {
  if (!webglCtxRegistry.has(canvas)) {
    webglCtxRegistry.set(canvas, new WebGLColormapContext(canvas));
  }
  return webglCtxRegistry.get(canvas)!;
}

type ColorMapProps = {
  readonly pixelField: PixelField;
  readonly colorScale: ColorScaleStatic;
};

export class ColorMapPainter implements Painter {

  private readonly logger = logger.child({ component: "ColorMapPainter" });

  constructor(readonly props: ColorMapProps) { }

  async draw(canvas: HTMLCanvasElement) {
    if (canvas.getContext("webgl2")) {
      const ctx = getWebGLContext(canvas);
      return ctx.draw(this.props.pixelField, this.props.colorScale, ALPHA);
    }
    return this.drawCPU(canvas);
  }

  async start() { }
  async stop() { }
  async destroy() { }

  private async drawCPU(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d")!;
    const pixelField = this.props.pixelField;
    const imgData = ctx.createImageData(
      pixelField.viewSize[0],
      pixelField.viewSize[1],
    );
    const rgba = imgData.data;

    const colorScale = createColorScale(this.props.colorScale);

    for (let i = 0; i < pixelField.data.length; i++) {
      const val = pixelField.data[i];
      const pos = i * 4;

      if (val === undefined || isNaN(val)) {
        rgba[pos + 3] = 0;
        continue;
      }
      const { r, g, b } = d3.rgb(colorScale(val));
      rgba[pos] = r;
      rgba[pos + 1] = g;
      rgba[pos + 2] = b;
      rgba[pos + 3] = Math.round(255 * ALPHA);
    }

    ctx.putImageData(imgData, 0, 0);
  }
}

export function createColorMapPainter(props: ColorMapProps) {
  return new ColorMapPainter(props);
}
