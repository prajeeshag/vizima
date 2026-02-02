import { createGridAgent, GridAgent, type GridConfig } from "../grid-data";
import { createPixelAgent, PixelAgent } from "../pixel-field";
import { createPColorPainter, PColorPainter } from "../painters";
import { type Layer } from "./layer";

export class PColorLayer implements Layer {
  private gridAgent: GridAgent;
  private pixelAgent: PixelAgent;

  constructor() {
    this.gridAgent = createGridAgent();
    this.pixelAgent = createPixelAgent();
  }

  async getPainter(props: GridConfig): Promise<PColorPainter> {
    const grid = await this.gridAgent.get(props);
    const field = await this.pixelAgent.get({ grid: grid });
    return createPColorPainter({ field: field });
  }
}
