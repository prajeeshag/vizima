import { PixelField } from "./pixel-field";
import { createPixelAgent } from "./interp-pixel";
import type { GridProjection, ProjectorState } from "../../projection";
import { getLonLatArray } from "../../projection";
import { tInterpolatePixelField } from "./utils";
import { createGridAgent } from "../dataset/grid-agent";
import { Grid } from "../dataset/grid"
import type { DataArray } from "../dataset/DataArray";
import QuickLRU from "quick-lru";
import stringify from "json-stable-stringify";



export type GetPixelArgs = {
  array: DataArray,
  z: number | undefined;
  gridProj: GridProjection;
  projectorState: ProjectorState;
  fillNN: boolean;
};

export function createPixelFetcher(n: number) {
  let lastPrefetchT2: number | null = null;
  let prefetch: Promise<[PixelField, Grid][]> | null = null;

  const gridAgents = Array.from({ length: 3 }, () =>
    Array.from({ length: n }, () => createGridAgent()),
  );

  const pixelAgents = Array.from({ length: 3 }, () =>
    Array.from({ length: n }, () => createPixelAgent()),
  );

  const pixelCache = new QuickLRU<string, [PixelField, Grid]>({ maxSize: 10 });

  return async function getPixel(
    args: GetPixelArgs[],
    timeIndex: number | undefined,
    numTimeSteps: number,
  ): Promise<[PixelField, Grid][]> {


    // if timeIndex is undefined, fetch from agent 0
    if (timeIndex === undefined) {
      return await fetch(args.map((x) => ({ ...x, t: timeIndex })), 0);
    }


    const t0 = Math.floor(timeIndex);
    const t1 = Math.ceil(timeIndex);
    const t2 = (t1 + 1) % numTimeSteps;

    if (t2 !== lastPrefetchT2) {
      await prefetch;
      lastPrefetchT2 = t2;
      prefetch = fetch(
        args.map((x) => ({
          ...x,
          t: t2,
        })),
        2,
      );
    }

    if (t1 === t0) {
      return await fetch(
        args.map((x) => ({
          ...x,
          t: t0,
        })),
        0,
      );
    }
    const alpha = timeIndex - t0;
    const [p0, p1] = await Promise.all([
      fetch(
        args.map((x) => ({
          ...x,
          t: t0,
        })),
        0,
      ),
      fetch(
        args.map((x) => ({
          ...x,
          t: t1,
        })),
        1,
      ),
    ]);

    const p = args.map(
      (x, i) =>
        [tInterpolatePixelField(p0[i]![0], p1[i]![0], alpha), p0[i]![1]] as [
          PixelField,
          Grid,
        ],
    );
    return p;
  };

  type FetchArgs = GetPixelArgs & {
    t: number | undefined;
  }

  async function fetch(
    args: FetchArgs[],
    agentId: 0 | 1 | 2,
  ): Promise<[PixelField, Grid][]> {
    return Promise.all(args.map((arg, i) => fetchOne(arg, agentId, i)));
  }

  async function fetchOne(
    arg: FetchArgs,
    agentId: number,
    i: number,
  ): Promise<[PixelField, Grid]> {

    const cacheKey = stringify({
      array: arg.array.toJSON(),
      gridProj: arg.gridProj,
      projectorState: arg.projectorState,
      z: arg.z,
      t: arg.t,
    })!;

    let hit = pixelCache.get(cacheKey)
    if (hit) return hit
    const { minLon, minLat, maxLon, maxLat } = getLonLatArray(arg.projectorState);
    const grid = await gridAgents[agentId]![i]!.run({
      ...arg,
      x0: minLon,
      x1: maxLon,
      y0: minLat,
      y1: maxLat,
    });

    const pixelField = await pixelAgents[agentId]![i]!.run({
      grid,
      gridProj: arg.gridProj,
      projectorState: arg.projectorState,
    });

    pixelCache.set(cacheKey, [pixelField, grid]);

    return [pixelField, grid];
  }

}
