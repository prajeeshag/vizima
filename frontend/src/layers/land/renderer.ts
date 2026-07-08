import { type Renderer } from "../../core/renderer";
import { createLandPainter, type LandProps } from "./painter";
import { type Expand } from "../../core/type-helpers";
import { mesh } from "topojson-client";

export type LandRendererProps = Expand<
  Omit<LandProps, "path"> & {
    topoJson: any;
  }
>;

export function createLandRenderer(kwrgs: {
  getProps: () => LandRendererProps;
}): Renderer {
  const getProps = kwrgs.getProps;

  return { render, stop, start, update }

  async function render(canvas: HTMLCanvasElement) {
    const props = getProps();
    const landJson = props.topoJson;
    const path = mesh(landJson);
    return createLandPainter({ ...props, path }).draw(canvas);
  };

  async function stop() { }
  async function start() { }
  async function update(canvas?: HTMLCanvasElement) {
    if (canvas) {
      await render(canvas);
    }
  }
};
