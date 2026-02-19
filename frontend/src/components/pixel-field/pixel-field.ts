import type { LatAxis, LonAxis } from "../dataset";
import { Grid } from "../grid-data";
import type { GridProjection, ProjectorState } from "../projection";
import { CachedResult } from "../types";
import * as d3 from "d3";

export type PixelProps = {
  readonly grid: Grid;
  readonly viewSize: [number, number];
  readonly gridProj: GridProjection;
  readonly projectorState: ProjectorState;
  readonly lonAxis: LonAxis;
  readonly latAxis: LatAxis;
};

export const pixelPropKeys = [
  "grid",
  "viewSize",
  "gridProj",
  "projectorState",
  "lonAxis",
  "latAxis",
] as const;

export class PixelField extends CachedResult<PixelProps, PixelFieldValue> {
  get viewSize(): [number, number] {
    return this.props.viewSize;
  }

  isDefined(x: number, y: number): boolean {
    return !Number.isNaN(this.get(x, y));
  }

  get(x: number, y: number): number {
    const xr = Math.round(x);
    const yr = Math.round(y);
    if (xr < 0 || xr >= this.viewSize[0] || yr < 0 || yr >= this.viewSize[1]) {
      return NaN;
    }
    const val = this.value.array[xr + yr * this.viewSize[0]];
    return val === undefined ? NaN : val;
  }

  min(): number {
    return this.value.range[0];
  }

  max(): number {
    return this.value.range[0];
  }
}

type PixelFieldValue = {
  array: Float32Array;
  range: readonly [number, number];
};
