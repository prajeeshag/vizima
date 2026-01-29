import { z } from "zod";
import { DataProjection } from "./projection";

const lon = z.number().min(-180).max(360);
const lat = z.number().min(-90).max(90);

const LonAxis = z
  .strictObject({
    // using array instead of tuple because tuple doesn't convert nicely to Pydantic model
    corners: z.array(lon).length(4),
    count: z.number().int().positive(),
  })
  .meta({ title: "LonAxis" });

const LatAxis = z
  .strictObject({
    corners: z.array(lat).length(4),
    count: z.number().int().positive(),
  })
  .meta({ title: "LatAxis" });

const VarSchema = z.strictObject({
  units: z.string(),
  long_name: z.string(),
  standard_name: z.string(),
});

export const DataVar = VarSchema.extend({
  arrName: z.string(),
  lon: z.string(),
  lat: z.string(),
  level: z.string(),
  time: z.string(),
}).meta({ title: "DataVar" });

export const VectorVar = VarSchema.extend({
  uArrName: z.string(),
  vArrName: z.string(),
}).meta({ title: "VectorVar" });

export const Dataset = z
  .strictObject({
    lons: z.record(z.string(), LonAxis),
    lats: z.record(z.string(), LatAxis),
    times: z.record(z.string(), z.array(z.string())),
    levels: z.record(z.string(), z.array(z.string())),
    datavars: z.record(z.string(), DataVar),
    vectors: z.record(z.string(), VectorVar),
    projection: DataProjection,
    title: z.string().max(100),
    subtitle: z.string().max(150),
    description: z.string(),
  })
  .meta({ title: "Dataset" });

export type DataVar = z.infer<typeof DataVar>;
export type VectorVar = z.infer<typeof VectorVar>;
export type Dataset = z.infer<typeof Dataset>;
export type LonAxis = z.infer<typeof LonAxis>;
export type LatAxis = z.infer<typeof LatAxis>;
