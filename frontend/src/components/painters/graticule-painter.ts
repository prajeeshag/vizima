import { Painter } from "./painter";
import { geoGraticule } from "d3-geo";
import { type ProjectorState, getProjector } from "../projection";

export type GraticuleProp = {
  readonly proj: ProjectorState;
  readonly strokeStyle?: string;
};

const defaultStrokeStyle: string = "rgba(255, 255, 255, 0.1)";

export class GraticulePainter extends Painter<GraticuleProp> {
  async draw(context: CanvasRenderingContext2D, signal?: AbortSignal) {
    const proj = getProjector(this.props.proj);
    context.beginPath();
    const graticule = geoGraticule();
    const strokeStyle = this.props.strokeStyle || defaultStrokeStyle;
    proj.geoPath(context)(graticule());
    context.strokeStyle = strokeStyle;
    context.stroke();
  }
}

export function createGraticulePainter(props: GraticuleProp): GraticulePainter {
  return new GraticulePainter(props, null);
}
