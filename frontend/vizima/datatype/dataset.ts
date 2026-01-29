import { z } from "zod";
import { DataProjection } from "./projections";

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

export const DataVarSchema = VarSchema.extend({
  arrName: z.string(),
  lon: z.string(),
  lat: z.string(),
  level: z.string(),
  time: z.string(),
}).meta({ title: "DataVar" });

export const VectorVarSchema = VarSchema.extend({
  uArrName: z.string(),
  vArrName: z.string(),
}).meta({ title: "VectorVar" });

export const DatasetSchema = z
  .strictObject({
    lons: z.record(z.string(), LonAxis),
    lats: z.record(z.string(), LatAxis),
    times: z.record(z.string(), z.array(z.string())),
    levels: z.record(z.string(), z.array(z.string())),
    datavars: z.record(z.string(), DataVarSchema),
    vectors: z.record(z.string(), VectorVarSchema),
    projection: DataProjection,
    title: z.string().max(100),
    subtitle: z.string().max(150),
    description: z.string(),
  })
  .meta({ title: "Dataset" });

export type DataVar = z.infer<typeof DataVarSchema>;
export type VectorVar = z.infer<typeof VectorVarSchema>;
export type Dataset = z.infer<typeof DatasetSchema>;
export type LonAxis = z.infer<typeof LonAxis>;
export type LatAxis = z.infer<typeof LatAxis>;
