import { CanvasElement } from "./canvas-element";
import { CachedResult, CachingCompute, DataClient } from "./types";
import { type Painter } from "./painters";

type CanvasRendererProps = {
  painters: Painter<any>[];
  canvas: CanvasElement;
  viewSize: [number, number];
};

export class CanvasRenderer extends CachedResult<
  CanvasRendererProps,
  HTMLCanvasElement
> {}

async function paint(
  props: CanvasRendererProps,
  signal?: AbortSignal,
): Promise<CanvasRenderer> {
  const canvas = props.canvas.value;
  canvas.width = props.viewSize[0];
  canvas.height = props.viewSize[1];
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas context not available");
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const painter of props.painters) {
    if (signal?.aborted) {
      throw new Error("Canvas creation aborted");
    }
    await painter.draw(ctx, signal);
  }
  return new CanvasRenderer(props, canvas);
}

export class PaintCanvasAgent extends DataClient<
  CanvasRendererProps,
  CanvasRenderer
> {}
export class PaintCanvasProvider extends CachingCompute<
  CanvasRendererProps,
  CanvasRenderer
> {}

const paintCanvasProvider = new PaintCanvasProvider(paint);

export function createPaintCanvasAgent(): PaintCanvasAgent {
  return new PaintCanvasAgent(paintCanvasProvider);
}
