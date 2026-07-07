import type {
  DatasetMeta,
  DataVarMeta,
  VectorVarMeta,
  LatAxis,
  LonAxis,
  TimeAxis,
  VertAxis,
} from "./schema";
import { GridProjection } from "../../projection";
import { PropValue } from "../../core/types";
import { openZarrArray } from "./open-zarr-array";
import QuickLRU from "quick-lru";
import { DataArray } from "./DataArray"

export type DatasetConfig = {
  url: string;
};

export const datasetConfigKeys = ["url"] as const;


export class Dataset extends PropValue<DatasetConfig, DatasetMeta> {
  private arrayCache: QuickLRU<string, DataArray>;

  constructor(
    override readonly props: DatasetConfig,
    override readonly value: DatasetMeta,
  ) {
    super(props, value);
    this.arrayCache = new QuickLRU<string, DataArray>({ maxSize: 10 });
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

  async getArray(vname: string): Promise<DataArray> {
    const url = this.getUrl(vname);
    if (!url) {
      throw new Error("URL not found for variable " + vname);
    }
    let hit = this.arrayCache.get(url);
    if (hit) return hit;
    const { dataArr, rangeArr, rangeTimeArr } = await openZarrArray(url);
    const lonAxis = this.getLonAxis(vname);
    const latAxis = this.getLatAxis(vname);
    if (!lonAxis || !latAxis) {
      throw new Error("Missing longitude or latitude axis");
    }
    const array = new DataArray(url, dataArr, rangeArr, rangeTimeArr, lonAxis, latAxis);
    this.arrayCache.set(url, array);
    return array;
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
