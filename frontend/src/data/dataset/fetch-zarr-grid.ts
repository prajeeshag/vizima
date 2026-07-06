import * as zarr from "zarrita";
import z from "zod";
import { type Array } from "./array"
import { type LonSubset } from "./lon-subsetting"

const ZarrAttrsSchema = z.looseObject({
  scale_factor: z.coerce.number().default(1),
  add_offset: z.coerce.number().default(0),
});

type GridProps = {
  arr: Array;
  lonSubsets: LonSubset[];
  latSubset: [number, number];
  t?: number;
  z?: number;
}

type Grid = {
  data: Float32Array,
  range: [number, number]
  rangeTime: [number, number]
  nx: number,
  ny: number,
}

export async function fetchZarrGrid(
  config: GridProps,
  signal: AbortSignal,
): Promise<Grid> {

  const [range, rangeTime] = await Promise.all(
    [getRange(config, signal), getRangeTime(config, signal)]
  )

  const gridList = await Promise.all(
    config.lonSubsets.slice(0, 2).map((subset) =>
      getValues(config, subset.start, subset.end, signal)
    )
  );

  let grid: Float32Array;
  let nx: number

  const ny = config.latSubset[1] - config.latSubset[0] + 1;

  if (gridList.length === 1) {
    grid = gridList[0]!
    nx = config.lonSubsets[0]!.end - config.lonSubsets[0]!.start + 1;
  } else {
    const [grid1, grid2] = gridList;
    if (!grid1 || !grid2) {
      throw new Error("Error in getting the grids")
    }
    const nx1 = config.lonSubsets[0]!.end - config.lonSubsets[0]!.start + 1;
    const nx2 = config.lonSubsets[1]!.end - config.lonSubsets[1]!.start + 1;
    nx = nx1 + nx2
    grid = new Float32Array(nx * ny);
    for (let y = 0; y < ny; y++) {
      grid.set(grid1.subarray(y * nx1, (y + 1) * nx1), y * nx);
      grid.set(grid2.subarray(y * nx2, (y + 1) * nx2), y * nx + nx1);
    }
  }
  return { data: grid, range, rangeTime, nx, ny }
}

async function getValues(
  config: GridProps,
  x0: number,
  x1: number,
  signal: AbortSignal
) {

  const arr = config.arr.value.arr;
  const attrs = ZarrAttrsSchema.parse(arr.attrs);

  const slice: (zarr.Slice | number)[] = [];
  if (config.t !== undefined) {
    slice.push(config.t);
  }
  if (config.z !== undefined) {
    slice.push(config.z);
  }

  slice.push(zarr.slice(config.latSubset[0], config.latSubset[1]));
  slice.push(zarr.slice(x0, x1));

  const sliceArray = await zarr.get(arr, slice, { signal: signal } as any);

  const values = new Float32Array(sliceArray.data as any).map(
    (x) => (x === -32767 ? NaN : x * attrs.scale_factor + attrs.add_offset)
  );

  return values;
}

async function fetchRange(
  arr: zarr.Array<zarr.DataType, zarr.FetchStore>,
  slice: (zarr.Slice | number | null)[],
  signal: AbortSignal,
): Promise<[number, number]> {
  const attrs = ZarrAttrsSchema.parse(arr.attrs);

  const val = await zarr.get(arr, slice, { signal } as any);
  const values = (val.data as number[]).map(
    (x) => x * attrs.scale_factor + attrs.add_offset,
  );
  return [values[0]!, values[1]!];
}

async function getRange(
  config: GridProps,
  signal: AbortSignal,
): Promise<[number, number]> {
  const slice: (zarr.Slice | number | null)[] = [];

  slice.push(null);
  if (config.t !== undefined) slice.push(config.t);
  if (config.z !== undefined) slice.push(config.z);

  return fetchRange(config.arr.value.rangeArr, slice, signal);
}

export async function getRangeTime(
  config: GridProps,
  signal: AbortSignal,
): Promise<[number, number]> {
  if (config.t === undefined) {
    return getRange(config, signal);
  }
  const slice: (zarr.Slice | number | null)[] = [];
  slice.push(null);
  if (config.z !== undefined) slice.push(config.z);
  return fetchRange(config.arr.value.rangeTimeArr, slice, signal);
}
