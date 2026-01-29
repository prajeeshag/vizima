import { Painter } from "./painter";
import type { PixelData } from "../pixel-field";
import { logger } from "../../logger";
import * as d3 from "d3";

type PColorProps = {
  readonly field: PixelData<any>;
};

class PColorPainter extends Painter<PColorProps> {
  private readonly log = logger.child({ component: "PColorPainter" });

  async draw(canvas: HTMLCanvasElement, signal: AbortSignal) {
    const pixelField = this.props.field;
    canvas.width = pixelField.props.viewSize[0];
    canvas.height = pixelField.props.viewSize[1];
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    const imgData = ctx.createImageData(canvas.width, canvas.height);
    const rgba = imgData.data;
    const min = pixelField.min();
    const max = pixelField.max();

    // This replaces manual normalization
    const colorScale = d3
      .scaleSequential(d3.interpolateViridis)
      .domain([min, max]) // Set the data bounds here
      .clamp(true); // Optional: keeps values outside domain from breaking

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

export default function createPColorPainter(props: PColorProps) {
  return new PColorPainter(props, null);
}
