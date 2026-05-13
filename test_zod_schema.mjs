import { z } from "zod";

const schema = z.object({
  finishedWeight: z.number().positive().describe("成品重量(克)"),
  materials: z.array(
    z.object({
      name: z.string().describe("原料名称"),
      type: z.enum(["herb", "supplement"]).describe("类型"),
      quantity: z.number().positive().describe("用量(克)"),
      ratioFactor: z.number().optional().describe("含量比因子"),
      nutrition_per_100g: z.object({
        protein: z.number().optional().describe("蛋白质"),
        fat: z.number().optional().describe("脂肪"),
        carbohydrate: z.number().optional().describe("碳水化合物"),
        sodium: z.number().optional().describe("钠"),
      }),
    }),
  ).min(1).describe("原料列表"),
});

const jsonSchema = schema.toJSON();
console.log("=== Full JSON Schema ===");
console.log(JSON.stringify(jsonSchema, null, 2));

console.log("\n=== Top-level type ===");
console.log("type:", jsonSchema.type);

console.log("\n=== materials.items.type ===");
console.log("materials items type:", jsonSchema.properties?.materials?.items?.type);

console.log("\n=== nutrition_per_100g type ===");
const matItems = jsonSchema.properties?.materials?.items;
console.log("nutrition_per_100g type:", matItems?.properties?.nutrition_per_100g?.type);

const simpleSchema = z.object({
  query: z.string().min(1).describe("查询描述"),
});
console.log("\n=== Simple schema ===");
console.log(JSON.stringify(simpleSchema.toJSON(), null, 2));
