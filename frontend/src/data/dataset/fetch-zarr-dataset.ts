import * as zarr from "zarrita";
import { logger } from "../../logger";
import { DatasetMeta } from ".";
import { Dataset, type DatasetConfig } from "./dataset";

export async function fetchZarrDataset(
  config: DatasetConfig,
  signal: AbortSignal,
): Promise<Dataset> {
  const log = logger.child({ component: "fetchZarrDataset" });

  let rootUrl = config.url;
  if (!config.url.startsWith("http")) {
    rootUrl = new URL(config.url, window.location.origin).href;
  }

  const store = new zarr.FetchStore(rootUrl);

  const arr = await zarr.open(store, { kind: "group" });

  log.debug(`Opened Zarr at ${config.url}`);
  console.log(`Opened Zarr at ${config.url}`);

  console.log(`attributes: ${JSON.stringify(arr.attrs)}`);
  const attrs = DatasetMeta.parse(arr.attrs);

  return new Dataset(config, attrs);
}
