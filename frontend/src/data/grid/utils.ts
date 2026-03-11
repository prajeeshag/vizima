import { Grid } from "../../data/grid";

export function tInterpolateGrids(g0: Grid, g1: Grid, alpha: number): Grid {
  if (g0.props.nx !== g1.props.nx || g0.props.ny !== g1.props.ny) {
    throw new Error("Grids must have the same dimensions");
  }
  const w0 = 1 - alpha;
  const w1 = alpha;
  const props = { ...g0.props, t: g0.props.t! + alpha };
  const value = new Float32Array(g0.value.grid.length);

  for (let i = 0; i < value.length; i++) {
    value[i] = g0.value.grid[i]! * w0 + g1.value.grid[i]! * w1;
  }

  return new Grid(props, { ...g0.value, grid: value });
}
