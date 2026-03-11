import { DataClient, CachingCompute } from "../../core/types";
import { fetchZarrGrid } from "./fetch-zarr-grid";
import { type GridProps, Grid, gridPropsKeys } from "./grid";

const CACHE_SIZE = 50;
export class GridAgent extends DataClient<GridProps, Grid> {}
export class GridProvider extends CachingCompute<
  GridProps,
  Grid,
  typeof gridPropsKeys
> {}

const gridProvider = new GridProvider(fetchZarrGrid, gridPropsKeys, {
  maxCacheSize: CACHE_SIZE,
});

export const createGridAgent = () => {
  return new GridAgent(gridProvider);
};
