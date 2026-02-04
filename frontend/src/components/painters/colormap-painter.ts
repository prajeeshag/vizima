import { Painter } from "./painter";
import type { PixelField } from "../pixel-field";
import { logger } from "../../logger";
import * as d3 from "d3";

type colorMapProps = {
  readonly field: PixelField;
};

export class colorMapPainter extends Painter<colorMapProps> {
  private readonly log = logger.child({ component: "PColorPainter" });

  async draw(ctx: CanvasRenderingContext2D, signal: AbortSignal) {
    const pixelField = this.props.field;
    const imgData = ctx.createImageData(
      pixelField.viewSize[0],
      pixelField.viewSize[1],
    );
    const rgba = imgData.data;

    const min = pixelField.min();
    const max = pixelField.max();

    // This replaces manual normalization
    const colorScale = d3
      .scaleSequential(d3.interpolateViridis)
      .domain([min, max])
      .clamp(true);

    for (let i = 0; i < pixelField.value.length; i++) {
      const val = pixelField.value[i];
      const pos = i * 4;

      if (!val || isNaN(val)) {
        rgba[pos + 3] = 0;
        continue;
      }
      const { r, g, b } = d3.rgb(colorScale(val));
      rgba[pos] = r;
      rgba[pos + 1] = g;
      rgba[pos + 2] = b;
      rgba[pos + 3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
  }
}

export function createPColorPainter(props: colorMapProps) {
  return new colorMapPainter(props, null);
}
