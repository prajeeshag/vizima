import { CanvasElement } from "./canvas-element";
import { type Painter } from "./painter";

type CanvasRendererProps = {
  readonly painters: Painter[];
  readonly canvas: CanvasElement;
  readonly viewSize: readonly [number, number];
};

export async function canvasRenderer(
  props: CanvasRendererProps,
): Promise<void> {
  const canvas = props.canvas.value;
  canvas.width = props.viewSize[0];
  canvas.height = props.viewSize[1];
  for (const painter of props.painters) {
    await painter.draw(canvas);
  }
}

