export type Animator = {
  animate: (htmlCanvas: HTMLCanvasElement) => void;
  start: () => void;
  stop: () => void;
};
