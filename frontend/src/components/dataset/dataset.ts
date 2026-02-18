import type {
  DatasetMeta,
  DataVarMeta,
  VectorVarMeta,
  LatAxis,
  LonAxis,
  TimeAxis,
  VertAxis,
} from ".";
import { GridProjection } from "../projection";
import { CachedResult } from "../types";

export type DatasetConfig = {
  url: string;
};

export const datasetConfigKeys = ["url"] as const;

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
    const attr = this.value.datavars[vname] ?? this.value.vectors[vname];
    if (!attr) return undefined;
    const vertAxis = this.value.verticals[attr.vertical];
    return vertAxis;
  }

  getTimeAxis(vname: string | undefined): TimeAxis | undefined {
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
