import { createGridAgent, type GridConfig } from "../grid-data";
import { createPixelAgent } from "../pixel-field";
import { createPColorPainter } from "../painters";
import { type LayerRenderer } from "./layer-renderer";
import type { Expand } from "../type-helpers";

type ColorMapProps = GridConfig;
export const createColorMapRenderer: LayerRenderer<ColorMapProps> = () => {
  const gridAgent = createGridAgent();
  const pixelAgent = createPixelAgent();

  return async (props: ColorMapProps) => {
    const grid = await gridAgent.get(props);
    const field = await pixelAgent.get({ grid: grid });
    return createPColorPainter({ field: field });
  };
};
