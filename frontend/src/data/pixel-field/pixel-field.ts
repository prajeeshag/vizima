import { Grid } from "../dataset/grid";
import type { GridProjection, ProjectorState } from "../../projection";

export type PixelProps = {
  readonly grid: Grid;
  readonly gridProj: GridProjection;
  readonly projectorState: ProjectorState;
};

export class PixelField {
  constructor(
    readonly data: Float32Array,
    readonly range: readonly [number, number],
    readonly projectorState: ProjectorState
  ) { }


  get viewSize(): readonly [number, number] {
    return this.projectorState.viewSize;
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
    const val = this.data[xr + yr * this.viewSize[0]];
    return val === undefined ? NaN : val;
  }

  min(): number {
    return this.range[0];
  }

  max(): number {
    return this.range[1];
  }
}
