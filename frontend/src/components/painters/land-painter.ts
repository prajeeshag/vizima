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
  async draw(
    context: CanvasRenderingContext2D,
    signal?: AbortSignal,
  ): Promise<void> {
    const topoJson = this.props.landJson.value;
    // const land = feature(topoJson, topoJson.objects.land);
    const land = mesh(topoJson, topoJson.objects.land);
    context.beginPath();
    context.strokeStyle = this.props.strokeStyle || "#f7faf8ff";
    context.lineWidth = this.props.lineWidth || 1;
    const proj = getProjector(this.props.projectorState);
    proj.geoPath(context)(land);
    context.stroke();
  }
}

export function createLandPainter(props: LandProps) {
  return new LandPainter(props, null);
}
