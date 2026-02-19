import { CanvasElement } from "./canvas-element";
import { CachedResult, CachingCompute, DataClient } from "./types";
import { Painter } from "./painters";
import { logger } from "../logger";

type CanvasRendererProps = {
  readonly painters: Painter<any>[];
  readonly canvas: CanvasElement;
  readonly viewSize: [number, number];
};

const canvasRendererPropsKeys = ["canvas", "painters", "viewSize"] as const;

/*
RenderedCanvas agent make sure that it re-renders only when the props change
*/

export class RenderedCanvas extends CachedResult<
  CanvasRendererProps,
  HTMLCanvasElement
> {}

async function paint(
  props: CanvasRendererProps,
  signal?: AbortSignal,
): Promise<RenderedCanvas> {
  const canvas = props.canvas.value;
  canvas.width = props.viewSize[0];
  canvas.height = props.viewSize[1];
  // const ctx = canvas.getContext("2d");
  // if (!ctx) throw new Error("Canvas context not available");
  // ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const painter of props.painters) {
    if (signal?.aborted) {
      throw new Error("Canvas creation aborted");
    }
    await painter.draw(canvas, signal);
  }
  return new RenderedCanvas(props, canvas);
}

export class RenderedCanvasAgent extends DataClient<
  CanvasRendererProps,
  RenderedCanvas
> {}
export class RenderedCanvasProvider extends CachingCompute<
  CanvasRendererProps,
  RenderedCanvas,
  typeof canvasRendererPropsKeys
> {}

export function createRenderedCanvasAgent(): RenderedCanvasAgent {
  const renderedCanvasProvider = new RenderedCanvasProvider(
    paint,
    canvasRendererPropsKeys,
  );
  return new RenderedCanvasAgent(renderedCanvasProvider);
}
