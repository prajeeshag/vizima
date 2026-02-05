import type { LatAxis, LonAxis } from "../dataset";
import { Grid, type GridProps } from "../grid-data";
import type { DataProjection, ProjectorState } from "../projection";
import { CachedResult } from "../types";
import * as d3 from "d3";

export type PixelProps = {
  readonly grid: Grid;
  readonly viewSize: [number, number];
  readonly gridProj: DataProjection;
  readonly proj: ProjectorState;
  readonly lonAxis: LonAxis;
  readonly latAxis: LatAxis;
};

export class PixelField extends CachedResult<PixelProps, Float32Array> {
  get viewSize(): [number, number] {
    return this.props.viewSize;
  }

  isDefined(x: number, y: number): boolean {
    return !Number.isNaN(this.get(x, y));
  }

  get(x: number, y: number): number {
    if (x < 0 || x >= this.viewSize[0] || y < 0 || y >= this.viewSize[1]) {
      return NaN;
    }
    const val = this.value[x + y * this.viewSize[0]];
    return val === undefined ? NaN : val;
  }

  min(): number {
    const val = d3.min(this.value);
    return val === undefined ? NaN : val;
  }

  max(): number {
    const val = d3.max(this.value);
    return val === undefined ? NaN : val;
  }
}
