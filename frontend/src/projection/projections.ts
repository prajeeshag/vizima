import * as d3 from "d3";
import { Projection } from "./schemas";
import { D3PROJ_MAP } from "./constants";
import { hasParallels } from "./utils";

import QuickLRU from "quick-lru";

const lonLatCache = new QuickLRU<string, { lonArray: Float32Array; latArray: Float32Array }>({ maxSize: 10, });


export type ProjectorState = {
  readonly type: Projection;
  readonly rotation: [number, number, number];
  readonly translation: [number, number];
  readonly scale: number;
  readonly parallels: [number, number];
  readonly viewSize: readonly [number, number];
};

export class Projector {
  constructor(private _projection: d3.GeoProjection) { }

  project([lon, lat]: [number, number]): [number, number] | null {
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
  const projection = D3PROJ_MAP[config.type.name]();
  if (hasParallels(projection)) {
    projection.parallels(config.parallels);
  }
  projection
    .rotate(config.rotation)
    .translate(config.translation)
    .scale(config.scale)
    .clipExtent([[0, 0], [...config.viewSize]]);

  return new Projector(projection);
}

export function getMask(config: ProjectorState) {
  const proj = getProjector(config);
  const canvas = document.createElement("canvas");
  canvas.width = config.viewSize[0];
  canvas.height = config.viewSize[1];
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context is null!");
  }
  ctx.beginPath();
  ctx.fillStyle = "rgba(255, 255, 255, 1)";
  proj.geoPath(ctx)({ type: "Sphere" });
  ctx.fill();
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;
  const mask = new Uint8Array(canvas.width * canvas.height);
  for (let i = 0; i < mask.length; i++) {
    mask[i] = pixels[i * 4 + 3]! > 0 ? 1 : 0;
  }
  return mask;
}

function cacheKey(config: ProjectorState) {
  return [
    config.type,
    ...config.rotation,
    ...config.translation,
    config.scale,
    ...config.parallels,
    ...config.viewSize,
  ].join("|");
}

export function getLonLatArray(config: ProjectorState) {
  const key = cacheKey(config);
  const cached = lonLatCache.get(key);
  if (cached) return cached;
  const mask = getMask(config)
  const width = config.viewSize[0]
  const height = config.viewSize[1]
  const lonArray = new Float32Array(width * height);
  const latArray = new Float32Array(width * height);
  const proj = getProjector(config)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      if (mask[index] === 1) {
        const coord = proj.invert([x, y]);
        if (!coord) {
          throw Error(`invert failed for pixel point ${[x, y]}`);
        }
        const [lon, lat] = coord;
        lonArray[index] = lon;
        latArray[index] = lat;
      } else {
        lonArray[index] = NaN
        latArray[index] = NaN
      }
    }
  }
  const result = { lonArray, latArray };
  lonLatCache.set(key, result);
  return result;
}
