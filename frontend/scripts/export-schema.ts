import { z } from "zod";
import * as fs from "fs";

import { DatasetMeta } from "../src/components/dataset/schema";

function exportSchema(schema: z.ZodObject<any>, filename: string) {
  const jsonSchema = schema.toJSONSchema({
    override: (ctx) => {
      const def = ctx.zodSchema._zod.def;
      if (ctx.jsonSchema.format === "date-time") {
        ctx.jsonSchema.format = "string";
      }
    },
  });
  fs.writeFileSync(filename, JSON.stringify(jsonSchema, null, 2));
  console.log(`✅ ${filename} has been generated`);
}

exportSchema(DatasetMeta, "dataset-schema.json");
