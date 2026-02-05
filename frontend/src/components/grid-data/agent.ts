import { DataClient, CachingCompute } from "../types";
import { fetchZarrGrid } from "./fetch-zarr-grid";
import { type GridProps, Grid } from "./grid";

const CACHE_SIZE = 50;
export class GridAgent extends DataClient<GridProps, Grid> {}
export class GridProvider extends CachingCompute<GridProps, Grid> {}

const gridProvider = new GridProvider(fetchZarrGrid, CACHE_SIZE);

export const createGridAgent = () => {
  return new GridAgent(gridProvider);
};
