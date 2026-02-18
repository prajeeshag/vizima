import { Painter } from "../painter";
import type { PixelField } from "../../pixel-field";
import { logger } from "../../../logger";
import * as d3 from "d3";
import { createColorScale, type ColorScaleStatic } from "./colorscale";

type ColorMapProps = {
  readonly pixelField: PixelField;
  readonly colorScale: ColorScaleStatic;
};

const ALPHA = 0.5;

export class ColorMapPainter extends Painter<ColorMapProps> {
  private readonly logger = logger.child({ component: "ColorMapPainter" });

  async draw(ctx: CanvasRenderingContext2D, signal: AbortSignal) {
    const pixelField = this.props.pixelField;
    const imgData = ctx.createImageData(
      pixelField.viewSize[0],
      pixelField.viewSize[1],
    );
    const rgba = imgData.data;

    const colorScale = createColorScale(this.props.colorScale);

    for (let i = 0; i < pixelField.value.length; i++) {
      const val = pixelField.value[i];
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
  return new ColorMapPainter(props, null);
}
