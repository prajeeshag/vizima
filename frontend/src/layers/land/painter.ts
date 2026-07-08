import { type Painter } from "../../core";
import { type ProjectorState, getProjector } from "../../projection";

export type LandProps = {
  readonly projectorState: ProjectorState;
  readonly path: any;
  readonly strokeStyle?: string;
  readonly lineWidth?: number;
};

export class LandPainter implements Painter {

  constructor(readonly props: LandProps) { }

  async draw(canvas: HTMLCanvasElement): Promise<void> {
    const ctx = canvas.getContext("2d")!;
    ctx.beginPath();
    ctx.strokeStyle = this.props.strokeStyle || "#333333ff";
    ctx.lineWidth = this.props.lineWidth || 1;
    const proj = getProjector(this.props.projectorState);
    proj.geoPath(ctx)(this.props.path);
    ctx.stroke();
  }
  async start() { }
  async stop() { }
  async destroy() { }
}

export function createLandPainter(props: LandProps) {
  return new LandPainter(props);
}
