import { JsonData } from "../json-data";
import { feature, mesh } from "topojson-client";
import { Painter } from "./painter";
import { type ProjectorState, getProjector } from "../projection";

export type LandProps = {
  readonly projectorState: ProjectorState;
  readonly landJson: JsonData;
  readonly strokeStyle?: string;
  readonly lineWidth?: number;
};

export class LandPainter extends Painter<LandProps> {
  async draw(canvas: HTMLCanvasElement, signal?: AbortSignal): Promise<void> {
    const ctx = canvas.getContext("2d")!;
    const topoJson = this.props.landJson.value;
    const land = mesh(topoJson, topoJson.objects.land);
    ctx.beginPath();
    ctx.strokeStyle = this.props.strokeStyle || "#f7faf8ff";
    ctx.lineWidth = this.props.lineWidth || 1;
    const proj = getProjector(this.props.projectorState);
    proj.geoPath(ctx)(land);
    ctx.stroke();
  }
}

export function createLandPainter(props: LandProps) {
  return new LandPainter(props, null);
}
