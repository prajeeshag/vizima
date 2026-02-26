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

  let rootUrl = config.url;
  if (!config.url.startsWith("http")) {
    rootUrl = new URL(config.url, window.location.origin).href;
  }

  const [values, range, rangeTime] = await Promise.all([
    getValues(rootUrl, config, signal),
    getRange(rootUrl, config, signal),
    getRangeTime(rootUrl, config, signal),
  ]);

  return new Grid(config, { grid: values, range, rangeTime });
}

async function getValues(url: string, config: GridProps, signal: AbortSignal) {
  const store = new zarr.FetchStore(url);
  const arr = await zarr.open(store, { kind: "array" });
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
    (x) => x * attrs.scale_factor + attrs.add_offset,
  );
  return values;
}

async function fetchRange(
  url: string,
  slice: (zarr.Slice | number | null)[],
  signal: AbortSignal,
): Promise<[number, number]> {
  const store = new zarr.FetchStore(url);
  const arr = await zarr.open(store, { kind: "array" });
  const attrs = ZarrAttrsSchema.parse(arr.attrs);

  const val = await zarr.get(arr, slice, { signal } as any);
  const values = (val.data as number[]).map(
    (x) => x * attrs.scale_factor + attrs.add_offset,
  );
  console.log(values);
  return [values[0]!, values[1]!];
}

async function getRange(
  url: string,
  config: GridProps,
  signal: AbortSignal,
): Promise<[number, number]> {
  const slice: (zarr.Slice | number | null)[] = [];

  slice.push(null);
  if (config.t !== undefined) slice.push(config.t);
  if (config.z !== undefined) slice.push(config.z);

  return fetchRange(url + "_range", slice, signal);
}

export async function getRangeTime(
  url: string,
  config: GridProps,
  signal: AbortSignal,
): Promise<[number, number]> {
  if (config.t === undefined) {
    return getRange(url, config, signal);
  }
  const slice: (zarr.Slice | number | null)[] = [];
  slice.push(null);
  if (config.z !== undefined) slice.push(config.z);
  return fetchRange(url + "_rangeTime", slice, signal);
}
