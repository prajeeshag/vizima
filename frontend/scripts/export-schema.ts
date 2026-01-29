import { z } from "zod";
import * as fs from "fs";

import { Dataset } from "../vizima/components/dataset";

function exportSchema(schema: z.ZodObject<any>, filename: string) {
  const jsonSchema = schema.toJSONSchema();
  fs.writeFileSync(filename, JSON.stringify(jsonSchema, null, 2));
  console.log(`✅ ${filename} has been generated`);
}

exportSchema(Dataset, "dataset-schema.json");
