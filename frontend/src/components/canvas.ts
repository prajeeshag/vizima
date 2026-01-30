interface IPainter {
  draw(canvas: HTMLCanvasElement, signal?: AbortSignal): Promise<void>;
}

export class Canvas {
  readonly canvas: HTMLCanvasElement;
  private painters: IPainter[];

  constructor(
    protected width: number,
    protected height: number,
    painters?: IPainter[],
    canvas?: HTMLCanvasElement,
  ) {
    this.canvas = canvas || document.createElement("canvas");
    this.painters = painters || [];
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  async paint(signal?: AbortSignal): Promise<void> {
    this.canvas.getContext("2d")?.clearRect(0, 0, this.width, this.height);
    for (const painter of this.painters) {
      if (signal?.aborted) {
        throw new Error("Canvas creation aborted");
      }
      painter.draw(this.canvas, signal);
    }
  }

  addPainter(painter: IPainter) {
    this.painters.push(painter);
    return this;
  }

  removePainter(painter: IPainter) {
    this.painters = this.painters.filter((p) => p !== painter);
    return this;
  }

  clearPainters() {
    this.painters = [];
    return this;
  }
}
