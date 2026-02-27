import { JsonData } from "../json-data";
import { Painter } from "./painter";
import { type ProjectorState, getProjector } from "../projection";

export type LandProps = {
  readonly projectorState: ProjectorState;
  readonly path: JsonData;
  readonly strokeStyle?: string;
  readonly lineWidth?: number;
};

export class LandPainter extends Painter<LandProps> {
  async draw(canvas: HTMLCanvasElement, signal?: AbortSignal): Promise<void> {
    const ctx = canvas.getContext("2d")!;
    ctx.beginPath();
    ctx.strokeStyle = this.props.strokeStyle || "#333333ff";
    ctx.lineWidth = this.props.lineWidth || 1;
    const proj = getProjector(this.props.projectorState);
    proj.geoPath(ctx)(this.props.path.value);
    ctx.stroke();
  }
}

export function createLandPainter(props: LandProps) {
  return new LandPainter(props, null);
}
