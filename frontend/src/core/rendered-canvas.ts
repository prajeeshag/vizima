import { CanvasElement } from "./canvas-element";
import { PropValue, SimpleAgent } from "./types";
import { Painter } from "./painter";

type CanvasRendererProps = {
  readonly painters: Painter<any>[];
  readonly canvas: CanvasElement;
  readonly viewSize: readonly [number, number];
};

const canvasRendererPropsKeys = ["canvas", "painters", "viewSize"] as const;

/*
RenderedCanvas agent make sure that it re-renders only when the props change
*/

export class RenderedCanvas extends PropValue<
  CanvasRendererProps,
  HTMLCanvasElement
> { }

async function paint(
  props: CanvasRendererProps,
  signal?: AbortSignal,
): Promise<RenderedCanvas> {
  const canvas = props.canvas.value;
  canvas.width = props.viewSize[0];
  canvas.height = props.viewSize[1];
  for (const painter of props.painters) {
    // signal?.throwIfAborted();
    await painter.draw(canvas, signal);
  }
  return new RenderedCanvas(props, canvas);
}

export function createRenderedCanvasAgent() {
  return new SimpleAgent<CanvasRendererProps, RenderedCanvas>(paint);
}
