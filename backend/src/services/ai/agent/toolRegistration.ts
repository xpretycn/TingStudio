import { z } from "zod";
import { toolRegistry } from "./toolRegistry.js";
import { nutritionEngine } from "../../formula/nutritionEngine.js";
import { ratioFactorValidator } from "../../formula/ratioFactorValidator.js";
import { costCalculator } from "../../formula/costCalculator.js";
import { fileParserService } from "../../file/fileParser.js";
import { salespersonService } from "../../business/salespersonService.js";
import { salesAnalysisService } from "../../business/salesAnalysisService.js";

export { toolRegistry };
export function registerAllTools(): void {
  toolRegistry.register({
    name: "calculate_nutrition",
    description: "计算配方的营养成分（7步法），包括含量比、Atwater能量、NRV%、归零阈值处理",
    paramsSchema: z.object({
      finishedWeight: z.number().positive().describe("成品重量(克)"),
      materials: z
        .array(
          z.object({
            name: z.string().describe("原料名称"),
            type: z.enum(["herb", "supplement"]).describe("类型：herb=药材, supplement=辅料"),
            quantity: z.number().positive().describe("用量(克)"),
            ratioFactor: z.number().optional().describe("含量比因子，药材默认0.18，辅料默认1.0"),
            nutrition_per_100g: z.object({
              protein: z.number().optional().describe("蛋白质(g/100g)"),
              fat: z.number().optional().describe("脂肪(g/100g)"),
              carbohydrate: z.number().optional().describe("碳水化合物(g/100g)"),
              sodium: z.number().optional().describe("钠(mg/100g)"),
            }),
          }),
        )
        .min(1)
        .describe("原料列表"),
    }),
    handler: async params => {
      const result = nutritionEngine.calculate(params);
      return { success: true, data: result };
    },
  });

  toolRegistry.register({
    name: "validate_ratio_factor",
    description: "校验配方原料总含量比是否在允许范围内（4级判定：normal/warning/high_warning/error）",
    paramsSchema: z.object({
      materials: z
        .array(
          z.object({
            quantity: z.number().positive().describe("原料用量(克)"),
            ratioFactor: z.number().optional().describe("含量比因子"),
          }),
        )
        .min(1)
        .describe("原料列表"),
      finishedWeight: z.number().positive().describe("成品重量(克)"),
    }),
    handler: async params => {
      const validation = ratioFactorValidator.validate(params.materials, params.finishedWeight);
      return { success: true, data: validation };
    },
  });

  toolRegistry.register({
    name: "calculate_cost",
    description: "计算配方成本，包括原料成本、包装、其他费用、利润率和总价",
    paramsSchema: z.object({
      materials: z
        .array(
          z.object({
            name: z.string().describe("原料名称"),
            quantity: z.number().positive().describe("用量(克)"),
            unitPrice: z.number().positive().describe("单价(元/公斤)"),
          }),
        )
        .min(1)
        .describe("原料列表"),
      packaging_cost: z.number().nonnegative().optional().default(0).describe("包装成本(元)"),
      other_costs: z.number().nonnegative().optional().default(0).describe("其他成本(元)"),
      profit_margin_percent: z.number().min(0).max(200).optional().default(20).describe("利润率(%)"),
      finished_weight: z.number().positive().optional().describe("成品重量(克)，用于计算单位成本"),
    }),
    handler: async params => {
      const { finished_weight, ...costInput } = params;
      const result = costCalculator.calculate(costInput);

      let unitCost = null;
      if (finished_weight) {
        unitCost = costCalculator.calculatePerUnit(result, finished_weight);
      }

      return { success: true, data: { ...result, unit_cost: unitCost } };
    },
  });

  toolRegistry.register({
    name: "parse_file",
    description: "解析上传的文件（Excel/图片/PDF），提取配方、原料或价格数据",
    paramsSchema: z.object({
      file_path: z.string().describe("文件路径"),
      filename: z.string().describe("文件名称"),
      file_type: z.enum(["excel", "image", "pdf"]).optional().describe("文件类型，不指定则自动检测"),
    }),
    handler: async params => {
      try {
        const fs = await import("fs");
        const buffer = fs.readFileSync(params.file_path);

        let result;
        switch (params.file_type || "excel") {
          case "excel":
            result = await fileParserService.parseExcel(buffer, params.filename);
            break;
          case "image":
            result = await fileParserService.parseImage(buffer, params.filename);
            break;
          case "pdf":
            result = await fileParserService.parsePDF(buffer, params.filename);
            break;
          default:
            throw new Error(`Unsupported file type`);
        }

        return { success: result.success, data: result, error: result.error };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Failed to parse file",
        };
      }
    },
    requiresConfirmation: false,
  });

  toolRegistry.register({
    name: "create_salesperson",
    description: "创建新的业务员记录",
    paramsSchema: z.object({
      name: z.string().min(1).describe("业务员姓名"),
      phone: z.string().optional().describe("联系电话"),
      email: z.string().email().optional().describe("电子邮箱"),
      department: z.string().optional().describe("所属部门"),
    }),
    handler: async params => {
      const result = await salespersonService.create(params);
      return { success: true, data: result };
    },
    requiresConfirmation: true,
  });

  toolRegistry.register({
    name: "query_salespersons",
    description: "查询业务员列表，支持搜索和筛选",
    paramsSchema: z.object({
      search: z.string().optional().describe("搜索关键词（姓名/电话/邮箱）"),
      status: z.enum(["active", "inactive"]).optional().describe("状态筛选"),
      department: z.string().optional().describe("部门筛选"),
      page: z.number().int().positive().optional().default(1).describe("页码"),
      limit: z.number().int().positive().max(100).optional().default(20).describe("每页数量"),
    }),
    handler: async params => {
      const result = await salespersonService.query(params);
      return { success: true, data: result };
    },
    requiresConfirmation: false,
  });

  toolRegistry.register({
    name: "update_salesperson",
    description: "更新业务员信息",
    paramsSchema: z.object({
      id: z.number().int().positive().describe("业务员ID"),
      name: z.string().min(1).optional().describe("姓名"),
      phone: z.string().optional().describe("电话"),
      email: z.string().email().optional().describe("邮箱"),
      department: z.string().optional().describe("部门"),
      status: z.enum(["active", "inactive"]).optional().describe("状态"),
    }),
    handler: async params => {
      const { id, ...updateData } = params;
      const result = await salespersonService.update(id, updateData);
      if (!result) {
        return { success: false, error: `Salesperson with ID ${id} not found` };
      }
      return { success: true, data: result };
    },
    requiresConfirmation: true,
  });

  toolRegistry.register({
    name: "delete_salesperson",
    description: "删除业务员记录",
    paramsSchema: z.object({
      id: z.number().int().positive().describe("业务员ID"),
    }),
    handler: async params => {
      const deleted = await salespersonService.delete(params.id);
      if (!deleted) {
        return { success: false, error: `Salesperson with ID ${params.id} not found` };
      }
      return { success: true, message: `Salesperson ${params.id} deleted successfully` };
    },
    requiresConfirmation: true,
  });

  toolRegistry.register({
    name: "analyze_sales",
    description: "分析销售数据，提供统计摘要、趋势图数据、TOP排行、区域分布和异常检测",
    paramsSchema: z.object({
      start_date: z.string().optional().describe("开始日期 (YYYY-MM-DD)"),
      end_date: z.string().optional().describe("结束日期 (YYYY-MM-DD)"),
      group_by: z
        .enum(["day", "week", "month", "salesperson", "region", "category"])
        .optional()
        .default("day")
        .describe("分组维度"),
    }),
    handler: async params => {
      const result = await salesAnalysisService.analyze(params);
      return { success: true, data: result };
    },
  });

  console.log(`[ToolRegistration] ✓ Registered ${toolRegistry.getAllTools().length} tools for AI Agent`);
}

export function getAvailableTools(): Array<{ name: string; description: string }> {
  return toolRegistry.getAllTools().map(t => ({
    name: t.name,
    description: t.description,
  }));
}
