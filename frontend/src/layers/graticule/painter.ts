import { type Painter } from "../../core/painter";
import { geoGraticule } from "d3-geo";
import { type ProjectorState, getProjector } from "../../projection";

export type GraticuleProp = {
  readonly projectorState: ProjectorState;
  readonly strokeStyle?: string;
  readonly lonStep?: number;
  readonly latStep?: number;
};

const defaultStrokeStyle: string = "rgba(125, 125, 125, 0.5)";

export class GraticulePainter implements Painter {
  constructor(readonly props: GraticuleProp) { }

  async draw(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext("2d")!;
    const proj = getProjector(this.props.projectorState);
    ctx.beginPath();
    let graticule = geoGraticule();
    if (this.props.lonStep && this.props.latStep) {
      graticule = geoGraticule().step([this.props.lonStep, this.props.latStep]);
    }
    const strokeStyle = this.props.strokeStyle || defaultStrokeStyle;
    proj.geoPath(ctx)(graticule());
    ctx.strokeStyle = strokeStyle;
    ctx.stroke();
  }

  async start() { }
  async stop() { }
  async destroy() { }
}

export function createGraticulePainter(props: GraticuleProp): GraticulePainter {
  return new GraticulePainter(props);
}
