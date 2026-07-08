
export type Animator = {
  draw: (htmlCanvas: HTMLCanvasElement, options?: {}) => void;
  start: (options?: {}) => void;
  stop: (options?: {}) => void;
  destroy: (options?: {}) => void;
};
