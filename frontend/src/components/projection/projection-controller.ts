import * as d3 from "d3";
import { zoom as d3zoom, type ZoomBehavior, type DragBehavior } from "d3";
import {
  Projection,
  type Corners,
  type ProjectorState,
  hasParallels,
  getDragHandler,
  getProjectionInit,
} from ".";

import { type IProjectionController } from "./drag-handlers";

const DEFAULT_SCALE_EXTENT: [number, number] = [1, 10];

export class ProjectionController implements IProjectionController {
  private _proj: d3.GeoProjection;
  readonly projParams: Projection;

  constructor(
    projParams: Projection,
    readonly viewSize: readonly [number, number],
    private scaleExtent: [number, number] = DEFAULT_SCALE_EXTENT,
    corners?: Corners,
    padding?: [number, number],
  ) {
    this.projParams = Projection.parse(projParams);
    const projInit = getProjectionInit(this.projParams);

    this._proj = projInit.init(viewSize, corners, padding);
  }

  invert(point: [number, number]): [number, number] | null {
    if (!this._proj.invert) return null;
    return this._proj.invert(point);
  }
  project(point: [number, number]): [number, number] | null {
    return this._proj(point);
  }

  getRotation(): [number, number, number] {
    return this._proj.rotate();
  }

  setRotation(rotation: [number, number, number]): void {
    this._proj.rotate(rotation);
  }

  getTranslate(): [number, number] {
    return this._proj.translate();
  }

  setTranslate(translate: [number, number]): void {
    this._proj.translate(translate);
  }

  getScale(): number {
    return this._proj.scale();
  }

  setScale(scale: number): void {
    this._proj.scale(scale);
  }

  getProjState(): ProjectorState {
    return {
      type: this.projParams,
      scale: this._proj.scale(),
      translation: this._proj.translate(),
      rotation: this._proj.rotate(),
      parallels: hasParallels(this._proj) ? this._proj.parallels() : [0, 0],
      viewSize: this.viewSize,
    };
  }

  dragHandler = (
    renderDrag: (proj: ProjectorState) => void,
    renderEnd: (proj: ProjectorState) => void,
  ): DragBehavior<HTMLCanvasElement, unknown, unknown> => {
    return getDragHandler(this.projParams.name)(this, renderDrag, renderEnd);
  };

  zoomHandler(
    renderZoom: (proj: ProjectorState) => void,
    renderEnd: (proj: ProjectorState) => void,
  ): ZoomBehavior<HTMLCanvasElement, unknown> {
    const baseScale = this._proj.scale();
    return d3zoom<HTMLCanvasElement, unknown>()
      .scaleExtent(this.scaleExtent)
      .on("zoom", (event) => {
        const { transform } = event;
        const newScale = baseScale * transform.k;
        this._proj.scale(newScale);
        renderZoom(this.getProjState());
      })
      .on("end", () => {
        renderEnd(this.getProjState());
      });
  }
}
