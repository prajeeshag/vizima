import type {
  DatasetMeta,
  DataVarMeta,
  VectorVarMeta,
  LatAxis,
  LonAxis,
  TimeAxis,
  VertAxis,
} from ".";
import { GridProjection } from "../../projection";
import { PropValue } from "../../core/types";
import { type Array } from "./array";
import { openZarrArray } from "./open-zarr-array";
import QuickLRU from "quick-lru";
import { Grid } from "./grid"
import { lonSubsetIndices } from "./lon-subsetting";
import { fetchZarrGrid } from "./fetch-zarr-grid"

export type DatasetConfig = {
  url: string;
};

export const datasetConfigKeys = ["url"] as const;

export class Dataset extends PropValue<DatasetConfig, DatasetMeta> {
  private arrayCache: QuickLRU<string, Array>;

  constructor(
    override readonly props: DatasetConfig,
    override readonly value: DatasetMeta,
  ) {
    super(props, value);
    this.arrayCache = new QuickLRU<string, Array>({ maxSize: 10 });
  }

  getLonAxis(vname: string): LonAxis | undefined {
    const attr = this.value.datavars[vname];
    if (!attr) return undefined;
    const lonAxis = this.value.lons[attr.lon];
    return lonAxis;
  }

  getLatAxis(vname: string): LatAxis | undefined {
    const attr = this.value.datavars[vname];
    if (!attr) return undefined;
    const latAxis = this.value.lats[attr.lat];
    return latAxis;
  }

  getVertAxis(vname: string): VertAxis | undefined {
    const attr = this.value.datavars[vname] ?? this.value.vectors[vname];
    if (!attr) return undefined;
    const vertAxis = this.value.verticals[attr.vertical];
    return vertAxis;
  }

  getTimeAxis(vname?: string): TimeAxis | undefined {
    if (!vname) {
      const values = Object.values(this.value.times);
      return values[0];
    }
    const attr = this.value.datavars[vname] ?? this.value.vectors[vname];
    if (!attr) return undefined;
    const timeAxis = this.value.times[attr.time];
    return timeAxis;
  }

  getUrl(vname: string): string | undefined {
    const attr = this.value.datavars[vname];
    if (!attr) return undefined;
    const url = this.props.url + `/${attr.arrName}`;
    return url;
  }

  async getArray(vname: string): Promise<Array | undefined> {
    const url = this.getUrl(vname);
    if (!url) return undefined;
    let hit = this.arrayCache.get(url);
    if (hit) return hit;
    const array = await openZarrArray({ url });
    this.arrayCache.set(url, array);
    return array;
  }

  async getGrid(
    vname: string,
    x0: number,
    x1: number,
    y0: number,
    y1: number,
    z: number | undefined,
    t: number | undefined,
    signal: AbortSignal,
  ): Promise<Grid> {

    if (x0 > x1) {
      throw new Error('x0 must be less than x1');
    }

    if (y0 > y1) {
      throw new Error('y0 must be less than y1');
    }

    const lonAxis = this.getLonAxis(vname);
    const latAxis = this.getLatAxis(vname);

    if (!lonAxis || !latAxis) {
      throw new Error('Missing longitude or latitude axis');
    }

    const lon0 = lonAxis.corners.lb;
    const lon1 = lonAxis.corners.rt;
    const nlon = lonAxis.count;
    const dlon = (lon1 - lon0) / (nlon - 1)
    const lat0 = latAxis.corners.lb;
    const lat1 = latAxis.corners.rt;
    const nlat = latAxis.count;
    const dlat = (lat1 - lat0) / (nlat - 1)

    const lonSubsets = lonSubsetIndices(lon0, lon1, nlon, x0, x1)
    const latSubset = latSubsetIndices(lat0, lat1, nlat, y0, y1)

    if (lonSubsets.length === 0) {
      throw new Error('Invalid lon indices')
    }

    const arr = await this.getArray(vname)

    if (!arr) {
      throw new Error("Invalid Array")
    }

    const config = { arr, lonSubsets, latSubset, t, z }
    const { data, range, rangeTime, nx, ny } = await fetchZarrGrid(config, signal)
    const olon0 = lon0 + lonSubsets[0]!.start * dlon
    const olat0 = lat0 + latSubset[0] * dlat

    return new Grid(data, range, rangeTime, olon0, olat0, nx, ny, dlon, dlat, z, t)

  }


  getGridProj(): GridProjection {
    return this.value.projection;
  }

  getGridMeta(vname: string): DataVarMeta | undefined {
    return this.value.datavars[vname];
  }

  getVectorMeta(vname: string): VectorVarMeta | undefined {
    return this.value.vectors[vname];
  }

  dataVars(): Record<string, DataVarMeta> {
    return this.value.datavars;
  }

  vectorVars(): Record<string, VectorVarMeta> {
    return this.value.vectors;
  }

  verticals(): Record<string, VertAxis> {
    return this.value.verticals;
  }
}

function latSubsetIndices(lat0: number, lat1: number, nlat: number, y0: number, y1: number): [number, number] {
  const dlon = (lat1 - lat0) / (nlat - 1)
  return [Math.floor((y0 - lat0) / dlon), Math.ceil((y1 - lat0) / dlon)]
}