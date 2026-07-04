
import { PropValue } from "../../core/types";
import * as zarr from "zarrita";

export type ArrayProps = { url: string; };

export const arrayPropsKeys = ["url"] as const;

type ArrayValue = {
    arr: zarr.Array<zarr.DataType, zarr.FetchStore>;
    rangeArr: zarr.Array<zarr.DataType, zarr.FetchStore>;
    rangeTimeArr: zarr.Array<zarr.DataType, zarr.FetchStore>;
};

export class Array extends PropValue<ArrayProps, ArrayValue> { }
