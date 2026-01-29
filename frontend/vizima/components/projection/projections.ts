import * as d3 from "d3";
import { type ProjectionName } from "./schemas";
import { D3PROJ_MAP } from "./constants";
import { hasParallels } from "./utils";

export type ProjectorState = {
  readonly name: ProjectionName;
  readonly rotation: [number, number, number];
  readonly translation: [number, number];
  readonly scale: number;
  readonly parallels: [number, number];
};

export class Projector {
  constructor(private _projection: d3.GeoProjection) {}

  project([lat, lon]: [number, number]): [number, number] | null {
    return this._projection([lon, lat]);
  }
  invert([x, y]: [number, number]): [number, number] | null {
    return this._projection.invert?.([x, y]) ?? null;
  }
  geoPath(ctx: CanvasRenderingContext2D) {
    return d3.geoPath(this._projection, ctx);
  }
}

export function getProjector(config: ProjectorState): Projector {
  const projection = D3PROJ_MAP[config.name]();
  if (hasParallels(projection)) {
    projection.parallels(config.parallels);
  }
  projection
    .rotate(config.rotation)
    .translate(config.translation)
    .scale(config.scale);
  return new Projector(projection);
}
