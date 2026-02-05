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

  const store = new zarr.FetchStore(rootUrl);

  const arr = await zarr.open(store, { kind: "array" });
  log.debug(`Opened Zarr at ${config.url}`);

  const attrs = ZarrAttrsSchema.parse(arr.attrs);

  const ndim = arr.shape.length;

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
  return new Grid(config, values);
}
