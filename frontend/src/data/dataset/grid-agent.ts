import * as zarr from "zarrita";
import z from "zod";
import { type DataArray } from "./DataArray"
import { lonSubsetIndices, type LonSubset } from "./lon-subsetting"
import { Grid } from "./grid"
import { SimpleAgent } from "../../core";

const ZarrAttrsSchema = z.looseObject({
  scale_factor: z.coerce.number().default(1),
  add_offset: z.coerce.number().default(0),
});


type GridArgs = {
  array: DataArray;
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  z: number | undefined;
  t: number | undefined;
  fillNN: boolean
}


export function createGridAgent() {
  return new SimpleAgent<GridArgs, Grid>(loadGrid)
}

async function loadGrid(
  args: GridArgs,
  signal: AbortSignal,
): Promise<Grid> {
  const { array, x0, x1, y0, y1, z, t, fillNN } = args

  if (x0 > x1) {
    throw new Error('x0 must be less than x1');
  }

  if (y0 > y1) {
    throw new Error('y0 must be less than y1');
  }

  const lonAxis = array.lonAxis
  const latAxis = array.latAxis

  if (!lonAxis || !latAxis) {
    throw new Error('Missing longitude or latitude axis');
  }

  const lon0 = lonAxis.corners.lb;
  const lon1 = lonAxis.corners.rt;
  const nlon = lonAxis.count;
  const dlon = (lon1 - lon0) / (nlon - 1)

  const lat0 = latAxis.corners.lb;
  const lat1 = latAxis.corners.rt;
  const nlat = latAxis.count;
  const dlat = (lat1 - lat0) / (nlat - 1)

  const lonSubsets = lonSubsetIndices(lon0, lon1, nlon, x0, x1)

  const latSubset = latSubsetIndices(lat0, lat1, nlat, y0, y1)

  if (lonSubsets.length === 0) {
    throw new Error(`Invalid lon indices for: lon0=${lon0}, lon1=${lon1}, x0=${x0}, x1=${x1}`)
  }

  const arr = array

  if (!arr) {
    throw new Error("Invalid Array")
  }

  const config = { arr, lonSubsets, latSubset, t, z, fillNN }
  const { data, range, rangeTime, nx, ny } = await loadGridValues(config, signal)

  let olon0 = lon0 + lonSubsets[0]!.start * dlon
  if (olon0 >= 180 && x0 < 0) {
    olon0 -= 360
  }
  const olat0 = lat0 + latSubset[0] * dlat

  return new Grid(array, data, range, rangeTime, olon0, olat0, nx, ny, dlon, dlat, z, t)
}

type GridProps = {
  arr: DataArray;
  lonSubsets: LonSubset[];
  latSubset: [number, number];
  fillNN: boolean,
  t: number | undefined;
  z: number | undefined;
}

async function loadGridValues(
  config: GridProps,
  signal: AbortSignal,
): Promise<{
  data: Float32Array,
  range: [number, number],
  rangeTime: [number, number],
  nx: number,
  ny: number,
}> {

  const [range, rangeTime] = await Promise.all(
    [loadRange(config, signal), loadRangeTime(config, signal)]
  )

  const gridList = await Promise.all(
    config.lonSubsets.slice(0, 2).map((subset) =>
      loadValues(config, subset.start, subset.end, signal)
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

  if (config.fillNN) fillNearestInPlace(grid, nx, ny)

  return { data: grid, range, rangeTime, nx, ny }
}

async function loadValues(
  config: GridProps,
  x0: number,
  x1: number,
  signal: AbortSignal
) {

  const arr = config.arr.dataArr
  const attrs = ZarrAttrsSchema.parse(arr.attrs);

  const slice: (zarr.Slice | number)[] = [];
  if (config.t !== undefined) {
    slice.push(config.t);
  }
  if (config.z !== undefined) {
    slice.push(config.z);
  }

  slice.push(zarr.slice(config.latSubset[0], config.latSubset[1] + 1));

  slice.push(zarr.slice(x0, x1 + 1));

  const sliceArray = await zarr.get(arr, slice, { signal: signal } as any);

  const values = new Float32Array(sliceArray.data as any).map(
    (x) => (x === arr.fillValue ? NaN : x * attrs.scale_factor + attrs.add_offset)
  );
  return values;
}

async function loadRange(
  config: GridProps,
  signal: AbortSignal,
): Promise<[number, number]> {
  const slice: (zarr.Slice | number | null)[] = [];

  slice.push(null);
  if (config.t !== undefined) slice.push(config.t);
  if (config.z !== undefined) slice.push(config.z);

  return loadRangeValues(config.arr.rangeArr, slice, signal);
}

export async function loadRangeTime(
  config: GridProps,
  signal: AbortSignal,
): Promise<[number, number]> {
  if (config.t === undefined) {
    return loadRange(config, signal);
  }
  const slice: (zarr.Slice | number | null)[] = [];
  slice.push(null);
  if (config.z !== undefined) slice.push(config.z);
  return loadRangeValues(config.arr.rangeTimeArr, slice, signal);
}

async function loadRangeValues(
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


function latSubsetIndices(lat0: number, lat1: number, nlat: number, y0: number, y1: number): [number, number] {
  const dlon = (lat1 - lat0) / (nlat - 1)
  const js = Math.max(Math.floor((y0 - lat0) / dlon), 0)
  const je = Math.min(Math.ceil((y1 - lat0) / dlon), nlat)
  return [js, je]
}

export function fillNearestInPlace(
  data: Float32Array,
  nx: number,
  ny: number,
): void {
  const n = nx * ny;

  const queue = new Int32Array(n);
  const visited = new Uint8Array(n);

  let head = 0;
  let tail = 0;

  // Initialize queue with valid source cells.
  for (let idx = 0; idx < n; idx++) {
    if (!Number.isNaN(data[idx])) {
      visited[idx] = 1;
      queue[tail++] = idx;
    }
  }

  while (head < tail) {
    const idx = queue[head++]!;
    const value = data[idx]!;

    const i = idx % nx;
    const j = (idx / nx) | 0;

    if (i > 0) {
      const m = idx - 1;
      if (!visited[m]) {
        visited[m] = 1;
        data[m] = value;
        queue[tail++] = m;
      }
    }

    if (i + 1 < nx) {
      const m = idx + 1;
      if (!visited[m]) {
        visited[m] = 1;
        data[m] = value;
        queue[tail++] = m;
      }
    }

    if (j > 0) {
      const m = idx - nx;
      if (!visited[m]) {
        visited[m] = 1;
        data[m] = value;
        queue[tail++] = m;
      }
    }

    if (j + 1 < ny) {
      const m = idx + nx;
      if (!visited[m]) {
        visited[m] = 1;
        data[m] = value;
        queue[tail++] = m;
      }
    }
  }
}