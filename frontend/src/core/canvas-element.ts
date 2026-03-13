import { PropValue } from "./types";

let canvasCount = 0;

export class CanvasElement extends PropValue<
  { id: string },
  HTMLCanvasElement
> {
  hide = () => {
    this.value.style.visibility = "hidden";
  };

  show = () => {
    this.value.style.visibility = "visible";
  };
}

export function createCanvas(prefix: string = "vizima") {
  const canvas = document.createElement("canvas");
  canvas.id = `${prefix}-${canvasCount++}`;
  return new CanvasElement({ id: canvas.id }, canvas);
}
