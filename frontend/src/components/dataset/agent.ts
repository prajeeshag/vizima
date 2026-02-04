import { DataClient, CachingCompute } from "../types";
import { Dataset, type DatasetConfig } from "./product";
import { fetchZarrDataset } from "./fetch-zarr-dataset";

export class DatasetProvider extends CachingCompute<DatasetConfig, Dataset> {}

export class DatasetAgent extends DataClient<DatasetConfig, Dataset> {}

export const zarrDatasetProvider = new DatasetProvider(fetchZarrDataset);

export function createZarrDatasetAgent(): DatasetAgent {
  return new DatasetAgent(zarrDatasetProvider);
}
