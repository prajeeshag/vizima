import * as d3 from "d3";
import { zoom as d3zoom, type ZoomBehavior, type DragBehavior } from "d3";
import { Data } from "../../datatype/types";
import { Projection } from "../../datatype/projections";

export type GlobeConfig = {
  name: string;
};

class Globe {
  private projection: Projection;

  constructor(props: {}) {}

  get proj(): ProjConfig {
    return {
      name: this.props.name,
      scale: 1,
      translate: [0, 0],
      rotate: [0, 0, 0],
    };
  }

  dragHandler(
    renderDrag: (proj: ProjConfig) => void,
    renderEnd: (proj: ProjConfig) => void,
  ): DragBehavior<HTMLCanvasElement, unknown, unknown> {
    return PROJECTIONS[this.props.proj].dragHandler(
      this,
      renderDrag,
      renderEnd,
    );
  }

  zoomHandler(
    renderZoom: (globe: Globe) => void,
    renderEnd: (globe: Globe) => void,
  ): ZoomBehavior<HTMLCanvasElement, unknown> {
    const s0 = this.getScale();
    return d3zoom<HTMLCanvasElement, unknown>()
      .scaleExtent(this.scaleExtent)
      .on("zoom", (event) => {
        const { transform } = event;
        const newScale = s0 * transform.k;
        this.setScale(newScale);
        renderZoom(this);
      })
      .on("end", () => {
        renderEnd(this);
      });
  }

  override getFingerprint(): string {
    const proj = this.props.proj;
    const viewSize = this.props.viewSize;
    const rot = this._projection.rotate();
    const trans = this._projection.translate();
    const scale = this._projection.scale();
    if ("parallels" in this._projection) {
      return JSON.stringify({
        proj: proj,
        viewSize: viewSize,
        rot: rot,
        trans: trans,
        scale: scale,
        parallels: (this._projection as any).parallels(),
      });
    }
    return JSON.stringify({
      proj: proj,
      viewSize: viewSize,
      rot: rot,
      trans: trans,
      scale: scale,
    });
  }
}
