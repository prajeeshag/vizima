import type {
  DatasetMeta,
  DataVarMeta,
  LatAxis,
  LonAxis,
  TimeAxis,
  VertAxis,
} from ".";
import { DataProjection } from "../projection";
import { CachedResult } from "../types";

export type DatasetConfig = {
  url: string;
};

export class Dataset extends CachedResult<DatasetConfig, DatasetMeta> {
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
    const attr = this.value.datavars[vname];
    if (!attr) return undefined;
    const vertAxis = this.value.verticals[attr.vertical];
    return vertAxis;
  }

  getTimeAxis(vname: string): TimeAxis | undefined {
    const attr = this.value.datavars[vname];
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

  getGridProj(): DataProjection {
    return this.value.projection;
  }

  getGridMeta(vname: string): DataVarMeta | undefined {
    return this.value.datavars[vname];
  }
}
