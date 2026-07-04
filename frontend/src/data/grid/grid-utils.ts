// import equal from "fast-deep-equal";
// import type { DataProjection, ProjectorState } from "../projection";
import { type LatAxis, type LonAxis } from "../dataset";
import { type GridProps } from "./grid";
import { type Array } from "../dataset"

export type GridConfig = {
  // readonly proj: ProjectorState;
  // readonly viewSize: [number, number];
  readonly arr: Array;
  readonly latAxis: LatAxis;
  readonly lonAxis: LonAxis;
  // readonly gridProj: DataProjection;
  readonly timeIndex?: number;
  readonly vertIndex?: number;
};

export function subsetGrid(
  config: GridConfig,
): [number, number, number, number] {
  // TODO: Implement proper subset calculation
  return [0, 0, config.lonAxis.count, config.latAxis.count];
}

export function getGridProps(config: GridConfig): GridProps {
  const [x0, y0, nx, ny] = subsetGrid(config);
  return {
    arr: config.arr,
    x0: x0,
    y0: y0,
    nx: nx,
    ny: ny,
    t: config.timeIndex,
    z: config.vertIndex,
  };
}
