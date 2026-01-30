import { z } from "zod";
import { DataProjection } from "../projection";

const lon = z.number().min(-180).max(360);
const lat = z.number().min(-90).max(90);
const lonCorners = z
  .object({ lb: lon, rb: lon, rt: lon, lt: lon })
  .meta({ title: "LonCorners" });
const latCorners = z
  .object({ lb: lat, rb: lat, rt: lat, lt: lat })
  .meta({ title: "LatCorners" });

export const LonAxis = z
  .strictObject({
    // using object instead of tuple because tuple doesn't convert nicely to Pydantic model
    corners: lonCorners,
    count: z.number().int().positive(),
  })
  .meta({ title: "LonAxis" });

export const LatAxis = z
  .strictObject({
    corners: latCorners,
    count: z.number().int().positive(),
  })
  .meta({ title: "LatAxis" });

export const TimeAxis = z
  .array(z.iso.datetime({ local: true }))
  .meta({ title: "TimeAxis" });

export const VertAxis = z.array(z.string()).meta({ title: "VertAxis" });

const Var = z.strictObject({
  units: z.string(),
  long_name: z.string(),
  standard_name: z.string(),
});

export const DataVarMeta = Var.extend({
  arrName: z.string(),
  lon: z.string(),
  lat: z.string(),
  vertical: z.string(),
  time: z.string(),
}).meta({ title: "DataVar" });

export const VectorVarMeta = Var.extend({
  uArrName: z.string(),
  vArrName: z.string(),
}).meta({ title: "VectorVar" });

export const DatasetMeta = z
  .strictObject({
    lons: z.record(z.string(), LonAxis),
    lats: z.record(z.string(), LatAxis),
    times: z.record(z.string(), TimeAxis),
    verticals: z.record(z.string(), VertAxis),
    datavars: z.record(z.string(), DataVarMeta),
    vectors: z.record(z.string(), VectorVarMeta),
    projection: DataProjection,
    title: z.string().max(100),
    subtitle: z.string().max(150),
    description: z.string(),
  })
  .refine(
    (data) => {
      for (const [name, attr] of Object.entries(data.datavars)) {
        if (attr.vertical && !(attr.vertical in data.verticals)) {
          return false;
        }
      }
      return true;
    },
    { error: "Datavar's vertical not present in Dataset verticals" },
  )
  .refine(
    (data) => {
      for (const [name, attr] of Object.entries(data.datavars)) {
        if (attr.time && !(attr.time in data.times)) {
          return false;
        }
      }
      return true;
    },
    { error: "Datavar's time not present in Dataset times" },
  )
  .refine(
    (data) => {
      for (const [name, attr] of Object.entries(data.datavars)) {
        if (attr.lon && !(attr.lon in data.lons)) {
          return false;
        }
      }
      return true;
    },
    { error: "Datavar's lon not present in Dataset lons" },
  )
  .refine(
    (data) => {
      for (const [name, attr] of Object.entries(data.datavars)) {
        if (attr.lat && !(attr.lat in data.lats)) {
          return false;
        }
      }
      return true;
    },
    { error: "Datavar's lat not present in Dataset lats" },
  )
  .meta({ title: "Dataset" });

export type LonAxis = z.infer<typeof LonAxis>;
export type LatAxis = z.infer<typeof LatAxis>;
export type TimeAxis = z.infer<typeof TimeAxis>;
export type VertAxis = z.infer<typeof VertAxis>;
export type DataVarMeta = z.infer<typeof DataVarMeta>;
export type VectorVarMeta = z.infer<typeof VectorVarMeta>;
export type DatasetMeta = z.infer<typeof DatasetMeta>;
