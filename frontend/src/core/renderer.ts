
export interface Renderer {
  render: (canvas: HTMLCanvasElement) => Promise<void>;
  update: (canvas?: HTMLCanvasElement) => Promise<void>;
  start: () => void;
  stop: () => void;
}