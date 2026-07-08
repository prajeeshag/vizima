import { type Painter } from "../../core";
import { type ProjectorState, getProjector } from "../../projection";
import { mesh, feature } from "topojson-client";

export type LandProps = {
  readonly projectorState: ProjectorState;
  readonly path: any;
  readonly strokeStyle?: string | null;
  readonly fillStyle?: string;
  readonly lineWidth?: number;
};


export class LandPainter implements Painter {

  constructor(readonly props: LandProps) { }


  async draw(canvas: HTMLCanvasElement): Promise<void> {
    const ctx = canvas.getContext("2d")!;
    const proj = getProjector(this.props.projectorState);

    ctx.beginPath();
    proj.geoPath(ctx)(this.props.path);

    let strokeStyle = this.props.strokeStyle
    if (this.props.strokeStyle === undefined) {
      strokeStyle = "#333333ff";
    }

    if (this.props.fillStyle) {
      ctx.fillStyle = this.props.fillStyle;
      ctx.fill();
    }

    if (strokeStyle) {
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = this.props.lineWidth ?? 1;
      ctx.stroke();
    }
  }

  async start() { }
  async stop() { }
  async destroy() { }
}

export function createLandPainter(props: LandProps) {
  return new LandPainter(props);
}
