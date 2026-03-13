import { createGridAgent, type GridProps, Grid } from "../grid";
import { createPixelAgent, type PixelProvider, PixelField } from ".";
import type { LatAxis, LonAxis } from "../dataset";
import type { GridProjection, ProjectorState } from "../../projection";
import { tInterpolatePixelField } from "./utils";

export type PixelGetArgs = {
  gridProps: GridProps;
  lonAxis: LonAxis;
  latAxis: LatAxis;
  gridProj: GridProjection;
  projectorState: ProjectorState;
};

export function createPixelFetcher(n: number, provider: PixelProvider) {
  let lastPrefetchT2: number | null = null;
  let prefetch: Promise<[PixelField, Grid][]> | null = null;

  const gridAgents = Array.from({ length: 3 }, () =>
    Array.from({ length: n }, () => createGridAgent()),
  );
  const pixelAgents = Array.from({ length: 3 }, () =>
    Array.from({ length: n }, () => createPixelAgent(provider)),
  );

  return async function getPixel(
    args: PixelGetArgs[],
    timeIndex: number | undefined,
    numTimeSteps: number,
  ): Promise<[PixelField, Grid][]> {
    if (timeIndex === undefined) {
      return await fetch(args, 0);
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
          gridProps: { ...x.gridProps, t: t2 },
        })),
        2,
      );
    }

    if (t1 === t0) {
      return await fetch(
        args.map((x) => ({
          ...x,
          gridProps: { ...x.gridProps, t: t0 },
        })),
        0,
      );
    }
    const alpha = timeIndex - t0;
    const [p0, p1] = await Promise.all([
      fetch(
        args.map((x) => ({
          ...x,
          gridProps: { ...x.gridProps, t: t0 },
        })),
        0,
      ),
      fetch(
        args.map((x) => ({
          ...x,
          gridProps: { ...x.gridProps, t: t1 },
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

  async function fetch(
    args: PixelGetArgs[],
    agentId: 0 | 1 | 2,
  ): Promise<[PixelField, Grid][]> {
    return Promise.all(args.map((arg, i) => fetchOne(arg, agentId, i)));
  }

  async function fetchOne(
    arg: PixelGetArgs,
    agentId: number,
    i: number,
  ): Promise<[PixelField, Grid]> {
    const grid = await gridAgents[agentId]![i]!.get(arg.gridProps);
    const pixelField = await pixelAgents[agentId]![i]!.get({
      grid,
      lonAxis: arg.lonAxis,
      latAxis: arg.latAxis,
      gridProj: arg.gridProj,
      projectorState: arg.projectorState,
    });
    return [pixelField, grid];
  }
}
