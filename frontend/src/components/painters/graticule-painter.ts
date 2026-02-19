import { Painter } from "./painter";
import { geoGraticule } from "d3-geo";
import { type ProjectorState, getProjector } from "../projection";

export type GraticuleProp = {
  readonly projectorState: ProjectorState;
  readonly strokeStyle?: string;
};

const defaultStrokeStyle: string = "rgba(255, 255, 255, 0.1)";

export class GraticulePainter extends Painter<GraticuleProp> {
  async draw(canvas: HTMLCanvasElement, signal?: AbortSignal) {
    const ctx = canvas.getContext("2d")!;
    const proj = getProjector(this.props.projectorState);
    ctx.beginPath();
    const graticule = geoGraticule();
    const strokeStyle = this.props.strokeStyle || defaultStrokeStyle;
    proj.geoPath(ctx)(graticule());
    ctx.strokeStyle = strokeStyle;
    ctx.stroke();
  }
}

export function createGraticulePainter(props: GraticuleProp): GraticulePainter {
  return new GraticulePainter(props, null);
}
