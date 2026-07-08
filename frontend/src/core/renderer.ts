
export interface Renderer {
  render: (canvas: HTMLCanvasElement) => Promise<void>;
  update: () => Promise<void>;
  start: () => void;
  stop: () => void;
}