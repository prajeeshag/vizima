import * as d3 from "d3";
import { Projection } from "./schemas";
import { D3PROJ_MAP } from "./constants";
import { hasParallels } from "./utils";
import { type LineString } from "geojson";

import QuickLRU from "quick-lru";



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

  geoPath(ctx?: CanvasRenderingContext2D) {
    if (!ctx) {
      return d3.geoPath(this._projection);
    }
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

function crossesLongitude(config: ProjectorState, lon: number): boolean {
  const coordinates = Array.from({ length: 19 }, (_, i) => [lon, 90 - i * 10])
  const meridian: LineString = {
    type: "LineString",
    coordinates: coordinates
  }
  const proj = getProjector(config)
  const bounds = proj.geoPath().bounds(meridian);
  if (!isFinite(bounds[0][0])) return false;
  return true
}

function crossesAntimeridian(config: ProjectorState): boolean {
  return crossesLongitude(config, 180);
}

function crossesMeridian(config: ProjectorState): boolean {
  return crossesLongitude(config, 0);
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


type LonLatArray = {
  lons: Float32Array;
  lats: Float32Array;
  minLon180: number;
  maxLon180: number;
  minLon360: number;
  maxLon360: number;
  minLon: number;
  maxLon: number;
  minLat: number;
  maxLat: number;
  crossesAM: boolean;
  crossesM: boolean;
};

const lonLatCache = new QuickLRU<string, LonLatArray>({ maxSize: 10, });

export function getLonLatArray(config: ProjectorState): LonLatArray {
  const key = cacheKey(config);
  const cached = lonLatCache.get(key);
  if (cached) return cached;
  const mask = getMask(config)
  const width = config.viewSize[0]
  const height = config.viewSize[1]
  const lons = new Float32Array(width * height);
  const lats = new Float32Array(width * height);
  let minLat = 90
  let maxLat = -90
  let minLon180 = 180
  let maxLon180 = -180
  let minLon360 = 360
  let maxLon360 = 0
  const crossesAM = crossesAntimeridian(config)
  const crossesM = crossesMeridian(config)
  const proj = getProjector(config)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      if (mask[index] === 1) {
        const coord = proj.invert([x, y]);
        if (!coord) {
          throw Error(`invert failed for pixel point ${[x, y]}`);
        }
        let lon = coord[0];
        let lat = coord[1];
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
        if (lon < minLon180) minLon180 = lon;
        if (lon > maxLon180) maxLon180 = lon;
        let lon360 = lon
        if (lon360 < 0) {
          lon360 += 360
        }
        if (lon360 < minLon360) minLon360 = lon360;
        if (lon360 > maxLon360) maxLon360 = lon360;
        if (crossesAM) {
          lon = lon360;
        }
        lons[index] = lon;
        lats[index] = lat;
      } else {
        lons[index] = NaN
        lats[index] = NaN
      }
    }
  }
  let minLon = minLon180
  let maxLon = maxLon180
  if (crossesAM) {
    minLon = minLon360
    maxLon = maxLon360
  }

  const result: LonLatArray = {
    lons, lats, minLon180, maxLon180,
    minLon360, maxLon360, minLat,
    maxLat, minLon, maxLon, crossesAM,
    crossesM
  };
  lonLatCache.set(key, result);
  return result;
}
