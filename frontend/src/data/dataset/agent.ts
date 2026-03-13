import { ComputeAgent, AsyncCache } from "../../core/types";
import { Dataset, type DatasetConfig, datasetConfigKeys } from "./dataset";
import { fetchZarrDataset } from "./fetch-zarr-dataset";

export class DatasetProvider extends AsyncCache<
  DatasetConfig,
  Dataset,
  typeof datasetConfigKeys
> {}

export class DatasetAgent extends ComputeAgent<DatasetConfig, Dataset> {}

export const zarrDatasetProvider = new DatasetProvider(
  fetchZarrDataset,
  datasetConfigKeys,
);

export function createZarrDatasetAgent(): DatasetAgent {
  return new DatasetAgent(zarrDatasetProvider);
}
