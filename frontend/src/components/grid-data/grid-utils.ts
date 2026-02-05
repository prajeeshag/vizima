// import equal from "fast-deep-equal";
// import type { DataProjection, ProjectorState } from "../projection";
import { type LatAxis, type LonAxis } from "../dataset";
import { type GridProps } from "./grid";

export type GridConfig = {
  // readonly proj: ProjectorState;
  // readonly viewSize: [number, number];
  readonly url: string;
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

// export function isNative(config: GridConfig): boolean {
//   return equal(config.proj.type, config.gridProj);
// }

export function getGridProps(config: GridConfig): GridProps {
  const [x0, y0, nx, ny] = subsetGrid(config);
  return {
    url: config.url,
    x0: x0,
    y0: y0,
    nx: nx,
    ny: ny,
    t: config.timeIndex,
    z: config.vertIndex,
  };
}
