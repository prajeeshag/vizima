import { Grid } from "../../components/grid-data";
import { PixelField } from "../../components/pixel-field";

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

export function tInterpolatePixelField(
  p0: PixelField,
  p1: PixelField,
  alpha: number,
): PixelField {
  if (p0.viewSize[0] !== p1.viewSize[0] || p0.viewSize[1] !== p1.viewSize[1]) {
    throw new Error("Pixel fields must have the same dimensions");
  }
  const w0 = 1 - alpha;
  const w1 = alpha;
  const gridProps = {
    ...p0.props.grid.props,
    t: p0.props.grid.props.t! + alpha,
  };
  const props = {
    ...p0.props,
    grid: new Grid(gridProps, {
      grid: new Float32Array(1),
      range: [0, 0] as [number, number],
      rangeTime: [0, 0] as [number, number],
    }),
  };
  const array = new Float32Array(p0.value.array.length);
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < array.length; i++) {
    const v = p0.value.array[i]! * w0 + p1.value.array[i]! * w1;
    array[i] = v;
    if (!Number.isNaN(v)) {
      min = Math.min(min, v);
      max = Math.max(max, v);
    }
  }
  return new PixelField(props, { array, range: [min, max] });
}
