import * as zarr from "zarrita";
import { logger } from "../../logger";
import { DatasetMeta } from ".";
import { DatasetProduct, type DatasetConfig } from "./product";

export async function fetchZarrDataset(
  config: DatasetConfig,
  signal: AbortSignal,
): Promise<DatasetProduct> {
  const log = logger.child({ component: "fetchZarrDataset" });

  let rootUrl = config.url;
  if (!config.url.startsWith("http")) {
    rootUrl = new URL(config.url, window.location.origin).href;
  }

  const store = new zarr.FetchStore(rootUrl);

  const arr = await zarr.open(store, { kind: "group" });
  log.debug(`Opened Zarr at ${config.url}`);

  const attrs = DatasetMeta.parse(arr.attrs);

  return new DatasetProduct(config, attrs);
}
