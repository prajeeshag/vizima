import * as zarr from "zarrita";
import { logger } from "../../logger";
import { type GridProps, Grid } from "./grid";
import z from "zod";

const ZarrAttrsSchema = z.looseObject({
  scale_factor: z.coerce.number().default(1),
  add_offset: z.coerce.number().default(0),
});

export async function fetchZarrGrid(
  config: GridProps,
  signal: AbortSignal,
): Promise<Grid> {
  const log = logger.child({ component: "fetchZarrGrid" });

  const [values, range, rangeTime] = await Promise.all([
    getValues(config, signal),
    getRange(config, signal),
    getRangeTime(config, signal),
  ]);

  return new Grid(config, { grid: values, range, rangeTime });
}

async function getValues(config: GridProps, signal: AbortSignal) {
  const arr = config.arr.value.arr;
  const attrs = ZarrAttrsSchema.parse(arr.attrs);

  const slice: (zarr.Slice | number)[] = [];
  if (config.t !== undefined) {
    slice.push(config.t);
  }
  if (config.z !== undefined) {
    slice.push(config.z);
  }
  slice.push(zarr.slice(config.y0, config.ny + config.y0));
  slice.push(zarr.slice(config.x0, config.nx + config.x0));

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
