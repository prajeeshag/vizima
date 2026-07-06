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
import { type Grid } from "./grid"



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
    z?: number,
    t?: number
  ): Promise<Grid | undefined> {

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
    const dlon = (lon1 - lon0) / nlon;
    const lat0 = latAxis.corners.lb;
    const lat1 = latAxis.corners.rt;
    const nlat = latAxis.count;
    const dlat = (lat1 - lat0) / nlat;
    const periodicLon = isPreriodicLonAxis(lonAxis);

    if (x0 >= 0 && x1 < 180) {

    }

    return undefined
  }

  getGridDims(
    vname: string,
    x0: number,
    x1: number,
    y0: number,
    y1: number,
    z?: number,
    t?: number
  ): [number, number, number, number] {

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
    const dlon = (lon1 - lon0) / nlon;
    const lat0 = latAxis.corners.lb;
    const lat1 = latAxis.corners.rt;
    const nlat = latAxis.count;
    const dlat = (lat1 - lat0) / nlat;
    const periodicLon = isPreriodicLonAxis(lonAxis);

    const i0 = Math.floor((x0 - lon0) / dlon);
    const i1 = Math.ceil((x1 - lon0) / dlon);
    const icount = i1 - i0 + 1;

    if (icount > nlon + 1 || (icount > nlon && !periodicLon)) {
      throw new Error('i dimension size exceeds the array size');
    }

    if (i0 < 0 && !periodicLon) {
      throw new Error('i dimension size exceeds the array size');
    }

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

function isPreriodicLonAxis(lonAxis: LonAxis): boolean {
  const lon0: number = lonAxis.corners.lb;
  const nlon: number = lonAxis.count;
  const dlon: number = (lonAxis.corners.rt - lon0 + 1) / nlon;
  return isPreriodicLon({ lon0: lon0, nlon: nlon, dlon: dlon });
}

export function isPreriodicLon(lon: {
  lon0: number;
  nlon: number;
  dlon: number;
}) {
  const lonEnd = lon.lon0 + lon.nlon * lon.dlon;
  return Math.abs(lon.lon0 - (lonEnd - 360)) < 1e-9;
}
