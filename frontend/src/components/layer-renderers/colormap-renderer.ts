import { createGridAgent, getGridProps } from "../grid-data";
import { createPixelAgent, type PixelProps } from "../pixel-field";
import { createPColorPainter } from "../painters";
import { type LayerRenderer } from "./layer-renderer";
import type { Expand } from "../type-helpers";

type ColorMapProps = Expand<Omit<PixelProps, "grid">> & {
  url: string;
  timeIndex?: number;
  vertIndex?: number;
};

export const createColorMapRenderer: LayerRenderer<ColorMapProps> = () => {
  const gridAgent = createGridAgent();
  const pixelAgent = createPixelAgent();

  return async (props: ColorMapProps) => {
    const gridProps = getGridProps(props);
    const grid = await gridAgent.get(gridProps);
    const field = await pixelAgent.get({ grid: grid, ...props });
    return createPColorPainter({ field: field });
  };
};
