
let canvasCount = 0;

export class CanvasElement {
  constructor(readonly id: string, readonly value: HTMLCanvasElement) { }
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
  return new CanvasElement(canvas.id, canvas);
}
