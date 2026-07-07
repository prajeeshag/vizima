
import * as zarr from "zarrita";
import type {
    LatAxis,
    LonAxis,
} from "./schema";


export class DataArray {
    constructor(
        readonly url: string,
        readonly dataArr: zarr.Array<zarr.DataType, zarr.FetchStore>,
        readonly rangeArr: zarr.Array<zarr.DataType, zarr.FetchStore>,
        readonly rangeTimeArr: zarr.Array<zarr.DataType, zarr.FetchStore>,
        readonly lonAxis: LonAxis,
        readonly latAxis: LatAxis
    ) { }

    toJSON() {
        return { url: this.url };
    }
}

