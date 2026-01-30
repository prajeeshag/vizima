import type { DataProjection, ProjectorState } from "../projection";
import { Product } from "../types";
import type { Grid } from "./grid";
import { type LatAxis, type LonAxis } from "../dataset";

export type GridConfig = {
  readonly proj: ProjectorState;
  readonly viewSize: [number, number];
  readonly url: string;
  readonly latAxis: LatAxis;
  readonly lonAxis: LonAxis;
  readonly gridProj: DataProjection;
  readonly timeIndex?: number;
  readonly vertIndex?: number;
};

export class GridProduct extends Product<GridConfig, Grid> {}
