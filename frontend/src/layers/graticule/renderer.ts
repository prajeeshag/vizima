import type { Renderer } from "../../core/renderer";
import {
  createGraticulePainter,
  type GraticuleProp,
} from "./painter";

export type GraticuleRendererProps = GraticuleProp;

export function createGraticuleRenderer(kwrgs: {
  getProps: () => GraticuleRendererProps;
}): Renderer {
  const getProps = kwrgs.getProps;

  return { render, stop, start, update }

  async function render(canvas: HTMLCanvasElement) {
    const props = getProps();
    createGraticulePainter(props).draw(canvas)
  };

  async function stop() {
  };

  async function start() {
  };

  async function update() {
  };
};
