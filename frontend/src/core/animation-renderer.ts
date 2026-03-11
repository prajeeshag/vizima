export interface AnimationRenderer {
  render: (...canvases: HTMLCanvasElement[]) => Promise<void>;
  update: () => Promise<void>;
  start: () => void;
  stop: () => void;
}
