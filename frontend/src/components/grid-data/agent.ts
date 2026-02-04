import { DataClient, CachingCompute } from "../types";
import { fetchZarrGrid } from "./fetch-zarr-grid";
import { type GridConfig, GridData } from "./gird-data";

const CACHE_SIZE = 50;
export class GridAgent extends DataClient<GridConfig, GridData> {}
export class GridScalarProvider extends CachingCompute<GridConfig, GridData> {}

const gridScalarProvider = new GridScalarProvider(fetchZarrGrid, CACHE_SIZE);

export const createGridAgent = () => {
  return new GridAgent(gridScalarProvider);
};
