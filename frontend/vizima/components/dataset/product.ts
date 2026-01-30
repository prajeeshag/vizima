import type {
  DatasetMeta,
  DataVarMeta,
  LatAxis,
  LonAxis,
  TimeAxis,
  VertAxis,
} from ".";
import { DataProjection } from "../projection";
import { Product } from "../types";

export type DatasetConfig = {
  url: string;
};

type DataVarConfig = {
  url: string;
  lonAxis: LonAxis;
  latAxis: LatAxis;
  verticalAxis: VertAxis;
  timeAxis: TimeAxis;
  gridProj: DataProjection;
  attrs: DataVarMeta;
};

export class DatasetProduct extends Product<DatasetConfig, DatasetMeta> {
  getVarConfig(name: string): DataVarConfig | undefined {
    const attr = this.value.datavars[name];
    if (!attr) return undefined;
    const url = this.props.url + `/${attr.arrName}`;
    const vertAxis = attr.vertical ? this.value.verticals[attr.vertical] : [];
    const timeAxis = attr.time ? this.value.times[attr.time] : [];
    const lonAxis = this.value.lons[attr.lon];
    const latAxis = this.value.lats[attr.lat];
    if (
      lonAxis === undefined ||
      latAxis === undefined ||
      vertAxis === undefined ||
      timeAxis === undefined
    ) {
      throw new Error(`Missing axis for variable ${name}`);
    }
    return {
      url,
      lonAxis: lonAxis,
      latAxis: latAxis,
      verticalAxis: vertAxis,
      timeAxis: timeAxis,
      gridProj: this.value.projection,
      attrs: attr,
    };
  }
}
