import { Agent, Provider } from "../types";
import { Dataset, type DatasetConfig } from "./product";
import { fetchZarrDataset } from "./fetch-zarr-dataset";

export class DatasetProvider extends Provider<DatasetConfig, Dataset> {}

export class DatasetAgent extends Agent<DatasetConfig, Dataset> {}

export const zarrDatasetProvider = new DatasetProvider(fetchZarrDataset);

export function createZarrDatasetAgent(): DatasetAgent {
  return new DatasetAgent(zarrDatasetProvider);
}
