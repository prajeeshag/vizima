import { DataClient, CachingCompute } from "../types";
import { Dataset, type DatasetConfig, datasetConfigKeys } from "./dataset";
import { fetchZarrDataset } from "./fetch-zarr-dataset";

export class DatasetProvider extends CachingCompute<
  DatasetConfig,
  Dataset,
  typeof datasetConfigKeys
> {}

export class DatasetAgent extends DataClient<DatasetConfig, Dataset> {}

export const zarrDatasetProvider = new DatasetProvider(
  fetchZarrDataset,
  datasetConfigKeys,
);

export function createZarrDatasetAgent(): DatasetAgent {
  return new DatasetAgent(zarrDatasetProvider);
}
