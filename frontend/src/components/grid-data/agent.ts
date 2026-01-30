import { Agent, Provider } from "../types";
import { fetchZarrGrid } from "./fetch-zarr-grid";
import { type GridConfig, GridProduct } from "./product";

const CACHE_SIZE = 50;
export class GridAgent extends Agent<GridConfig, GridProduct> {}
export class GridScalarProvider extends Provider<GridConfig, GridProduct> {}

const gridScalarProvider = new GridScalarProvider(fetchZarrGrid, CACHE_SIZE);

export const createGridAgent = () => {
  return new GridAgent(gridScalarProvider);
};
