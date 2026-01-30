import { Agent, Provider } from "../types";
import { DatasetProduct, type DatasetConfig } from "./product";
import { fetchZarrDataset } from "./fetch-zarr-dataset";

export class DatasetProvider extends Provider<DatasetConfig, DatasetProduct> {}

export class DatasetAgent extends Agent<DatasetConfig, DatasetProduct> {}

export const zarrDatasetProvider = new DatasetProvider(fetchZarrDataset);

export function createZarrDatasetAgent(): DatasetAgent {
  return new DatasetAgent(zarrDatasetProvider);
}
