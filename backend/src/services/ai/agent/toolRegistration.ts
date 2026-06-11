import { z } from "zod";
import { toolRegistry } from "./toolRegistry.js";
import { nutritionEngine } from "../../formula/nutritionEngine.js";
import { ratioFactorValidator } from "../../formula/ratioFactorValidator.js";
import { costCalculator } from "../../formula/costCalculator.js";
import { salespersonService } from "../../business/salespersonService.js";
import { salesAnalysisService } from "../../business/salesAnalysisService.js";
import { getDb } from "../../../config/database-better-sqlite3.js";
import path from "node:path";

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
    name: "query_salespersons",
    description: "查询业务员列表，数据来源于数据库salesmen表，支持搜索和筛选",
    paramsSchema: z.object({
      search: z.string().optional().describe("搜索关键词（姓名/电话/邮箱）"),
      status: z.enum(["active", "inactive"]).optional().describe("状态筛选"),
      department: z.string().optional().describe("部门筛选"),
      page: z.number().int().positive().optional().default(1).describe("页码"),
      limit: z.number().int().positive().max(100).optional().default(20).describe("每页数量"),
    }),
    handler: async params => {
      try {
        const result = await salespersonService.query(params);
        if (result.data.length === 0) {
          return {
            success: true,
            data: result,
            message: "数据库中暂无业务员数据。您可以通过「创建业务员」功能添加新的业务员记录。",
          };
        }
        return { success: true, data: result };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "查询业务员失败" };
      }
    },
    requiresConfirmation: false,
  });

  toolRegistry.register({
    name: "analyze_sales",
    description:
      "分析销售数据，提供统计摘要、趋势、TOP排行等。数据来源于formula_sales表，如果数据库中没有销售记录，会明确告知用户。",
    paramsSchema: z.object({
      start_date: z.string().optional().describe("开始日期 (YYYY-MM-DD)"),
      end_date: z.string().optional().describe("结束日期 (YYYY-MM-DD)"),
      group_by: z
        .enum(["day", "week", "month", "salesperson", "region", "category"])
        .optional()
        .default("month")
        .describe("分组维度"),
    }),
    handler: async params => {
      try {
        const result = await salesAnalysisService.analyze(params);
        if (!result.has_data) {
          return {
            success: true,
            data: result,
            message:
              "数据库中暂无销售数据。请先通过配方管理页面录入销售数据，或使用「创建销售记录」功能添加数据后再进行分析。",
          };
        }
        return { success: true, data: result };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "销售分析失败，请检查数据库连接是否正常",
        };
      }
    },
  });

  toolRegistry.register({
    name: "query_formulas",
    description: "查询配方列表，数据来源于数据库formulas表，支持按名称、业务员搜索",
    paramsSchema: z.object({
      keyword: z.string().optional().describe("搜索关键词（配方名称/业务员名称）"),
      salesman_id: z.string().optional().describe("业务员ID筛选"),
      page: z.number().int().positive().optional().default(1).describe("页码"),
      limit: z.number().int().positive().max(50).optional().default(10).describe("每页数量"),
    }),
    handler: async (params, context) => {
      try {
        const db = getDb();
        const { keyword, salesman_id, page = 1, limit = 10 } = params;
        const offset = (page - 1) * limit;
        const conditions: string[] = [];
        const sqlParams: any[] = [];

        const userId = context?.userId;
        let userRole = "user";
        if (userId) {
          try {
            const userRow = db.prepare("SELECT role FROM users WHERE id = ?").get(userId) as any;
            if (userRow?.role === "admin") userRole = "admin";
          } catch {}
        }

        if (userRole !== "admin" && userId) {
          conditions.push("f.created_by = ?");
          sqlParams.push(userId);
        }

        if (keyword) {
          conditions.push("(f.name LIKE ? OR f.salesman_name LIKE ?)");
          const like = `%${keyword}%`;
          sqlParams.push(like, like);
        }
        if (salesman_id) {
          conditions.push("f.salesman_id = ?");
          sqlParams.push(salesman_id);
        }

        const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
        const rows = db
          .prepare(
            `SELECT f.id, f.code, f.name, f.salesman_name, f.finished_weight, f.ratio_factor, f.description, f.created_at FROM formulas f ${whereSql} ORDER BY f.created_at DESC LIMIT ? OFFSET ?`,
          )
          .all(...sqlParams, limit, offset);
        const countRow = db.prepare(`SELECT COUNT(*) as total FROM formulas f ${whereSql}`).get(...sqlParams) as any;

        if (rows.length === 0) {
          return {
            success: true,
            data: { rows, total: countRow?.total || 0, page, limit, keyword },
            message: `未找到匹配"${keyword || ""}"的配方记录。数据库中暂无符合条件的配方数据。`,
          };
        }

        return { success: true, data: { rows, total: countRow?.total || 0, page, limit, keyword } };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "查询配方失败" };
      }
    },
  });

  toolRegistry.register({
    name: "query_materials",
    description: "查询原料列表，数据来源于数据库materials表，支持按名称、编码搜索",
    paramsSchema: z.object({
      keyword: z.string().optional().describe("搜索关键词（原料名称/编码）"),
      material_type: z.enum(["herb", "supplement"]).optional().describe("原料类型筛选：herb=药材, supplement=辅料"),
      page: z.number().int().positive().optional().default(1).describe("页码"),
      limit: z.number().int().positive().max(50).optional().default(10).describe("每页数量"),
    }),
    handler: async (params, context) => {
      try {
        const db = getDb();
        const { keyword, material_type, page = 1, limit = 10 } = params;
        const offset = (page - 1) * limit;
        const conditions: string[] = ["is_deleted = 0"];
        const sqlParams: any[] = [];

        if (keyword) {
          conditions.push("(name LIKE ? OR code LIKE ?)");
          const like = `%${keyword}%`;
          sqlParams.push(like, like);
        }
        if (material_type) {
          conditions.push("material_type = ?");
          sqlParams.push(material_type);
        }

        const whereSql = `WHERE ${conditions.join(" AND ")}`;
        const rows = db
          .prepare(
            `SELECT id, code, name, unit, stock, material_type, unit_price FROM materials ${whereSql} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
          )
          .all(...sqlParams, limit, offset);
        const countRow = db.prepare(`SELECT COUNT(*) as total FROM materials ${whereSql}`).get(...sqlParams) as any;

        if (rows.length === 0) {
          return {
            success: true,
            data: { rows, total: countRow?.total || 0, page, limit, keyword },
            message: `未找到匹配"${keyword || ""}"的原料记录。数据库中暂无符合条件的原料数据。`,
          };
        }

        return { success: true, data: { rows, total: countRow?.total || 0, page, limit } };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "查询原料失败" };
      }
    },
  });

  toolRegistry.register({
    name: "nl2sql_query",
    description: `自然语言转SQL查询，支持跨表JOIN、聚合分析、模糊搜索等高级查询。仅支持SELECT查询，禁止修改操作。
适用场景：
- 跨表关联查询（如"查找配方及其原料信息"）
- 聚合统计分析（如"按业务员统计配方数量"、"按月统计销量趋势"）
- 复杂组合条件（如"查找含有黄芪且成品重量大于100g的配方"）
- 专用查询工具无法满足的灵活查询需求
不适用场景（优先使用专用工具）：
- 简单查配方列表 → query_formulas
- 简单查原料列表 → query_materials
- 简单查业务员列表 → query_salespersons`,
    paramsSchema: z.object({
      query: z.string().min(1).describe("自然语言查询描述，如'查找含有黄芪且成品重量大于100g的配方'"),
    }),
    handler: async (params, context) => {
      try {
        const { AIService } = await import("../AIService.js");
        const aiService = new AIService();

        const db = getDb();
        const tables = db
          .prepare(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'ai_%' AND name NOT LIKE 'agent_%' AND name NOT LIKE 'search_%' AND name NOT LIKE 'file_%' AND name NOT LIKE 'report_%' AND name NOT LIKE 'export_%' AND name NOT LIKE 'nutrition_%' AND name NOT LIKE 'upload_%'",
          )
          .all() as any[];
        const tableNames = tables.map((t: any) => t.name);

        const schemaInfo: string[] = [];
        for (const tableName of tableNames) {
          const cols = db.prepare(`PRAGMA table_info(${tableName})`).all() as any[];
          schemaInfo.push(`${tableName}(${cols.map((c: any) => `${c.name}:${c.type}`).join(", ")})`);
        }

        const schemaPrompt = schemaInfo.join("\n");
        const messages = [
          {
            role: "system" as const,
            content: `你是SQL生成引擎。根据用户的自然语言查询，生成SQLite SELECT语句。

## 数据库Schema
${schemaPrompt}

## 规则
1. 只生成SELECT语句，禁止INSERT/UPDATE/DELETE/DROP/ALTER
2. 表名和列名必须严格匹配Schema
3. 字符串值使用LIKE模糊匹配
4. 数值比较使用精确匹配
5. 只输出一条SQL语句，不要解释`,
          },
          { role: "user" as const, content: params.query },
        ];

        const result = await aiService.chatCompletion("deepseek", messages, {
          temperature: 0.1,
          maxTokens: 500,
          callType: "nl2sql",
        });

        let sql = result.content.trim();
        const sqlMatch = sql.match(/```(?:sql)?\s*([\s\S]*?)```/);
        if (sqlMatch) sql = sqlMatch[1].trim();
        sql = sql.replace(/;$/, "").trim();

        const upperSQL = sql.toUpperCase().trim();
        if (!upperSQL.startsWith("SELECT")) {
          return { success: false, error: "仅支持SELECT查询，不允许修改操作" };
        }
        const forbiddenPatterns = [/INSERT/i, /UPDATE/i, /DELETE/i, /DROP/i, /ALTER/i, /CREATE/i, /ATTACH/i, /PRAGMA/i];
        for (const pattern of forbiddenPatterns) {
          if (pattern.test(sql)) {
            return { success: false, error: "SQL包含禁止的操作，仅允许SELECT查询" };
          }
        }

        const userId = context?.userId;
        let userRole = "user";
        if (userId) {
          try {
            const userRow = db.prepare("SELECT role FROM users WHERE id = ?").get(userId) as any;
            if (userRow?.role === "admin") userRole = "admin";
          } catch {}
        }

        let finalSQL = sql;
        const finalParams: unknown[] = [];
        if (userRole !== "admin" && userId) {
          if (/formulas/i.test(finalSQL)) {
            if (/WHERE/i.test(finalSQL)) {
              finalSQL = finalSQL.replace(/WHERE/i, `WHERE created_by = ? AND`);
              finalParams.push(userId);
            } else {
              finalSQL = finalSQL.replace(/FROM\s+formulas/i, `FROM formulas WHERE created_by = ?`);
              finalParams.push(userId);
            }
          }
        }

        const rows = db.prepare(finalSQL).all(...finalParams) as any[];
        const rowCount = rows.length;

        const queryType = detectQueryType(finalSQL);

        return {
          success: true,
          data: {
            sql: finalSQL,
            originalSQL: sql !== finalSQL ? sql : undefined,
            rows,
            rowCount,
            query: params.query,
            queryType,
          },
        };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "NL2SQL查询失败" };
      }
    },
  });

  function detectQueryType(sql: string): string {
    const upper = sql.toUpperCase();
    if (/GROUP BY/i.test(sql)) return "aggregate";
    if (/JOIN/i.test(sql)) return "join";
    return "simple";
  }

  toolRegistry.register({
    name: "compare_formulas",
    description: "对比两个配方的营养成分、原料组成和成本差异。需要提供两个配方的ID或名称。",
    paramsSchema: z.object({
      formula_a: z.string().describe("配方A的ID或名称"),
      formula_b: z.string().describe("配方B的ID或名称"),
    }),
    handler: async (params, context) => {
      try {
        const db = getDb();
        const userId = context?.userId;

        function findFormula(idOrName: string) {
          let row = db.prepare("SELECT * FROM formulas WHERE id = ?").get(idOrName) as any;
          if (!row) {
            const rows = db.prepare("SELECT * FROM formulas WHERE name LIKE ? LIMIT 1").get(`%${idOrName}%`) as any;
            row = rows;
          }
          return row;
        }

        const formulaA = findFormula(params.formula_a);
        const formulaB = findFormula(params.formula_b);

        if (!formulaA) return { success: false, error: `未找到配方"${params.formula_a}"` };
        if (!formulaB) return { success: false, error: `未找到配方"${params.formula_b}"` };

        const materialsA =
          typeof formulaA.materials_json === "string"
            ? JSON.parse(formulaA.materials_json)
            : formulaA.materials_json || [];
        const materialsB =
          typeof formulaB.materials_json === "string"
            ? JSON.parse(formulaB.materials_json)
            : formulaB.materials_json || [];

        const nutritionA = nutritionEngine.calculate({
          finishedWeight: formulaA.finished_weight,
          materials: materialsA.map((m: any) => ({
            name: m.materialName || m.name,
            type: m.type || "herb",
            quantity: m.quantity,
            ratioFactor: m.type === "supplement" ? 1.0 : 0.18,
          })),
        });
        const nutritionB = nutritionEngine.calculate({
          finishedWeight: formulaB.finished_weight,
          materials: materialsB.map((m: any) => ({
            name: m.materialName || m.name,
            type: m.type || "herb",
            quantity: m.quantity,
            ratioFactor: m.type === "supplement" ? 1.0 : 0.18,
          })),
        });

        const allMaterialNames = new Set([
          ...materialsA.map((m: any) => m.materialName || m.name),
          ...materialsB.map((m: any) => m.materialName || m.name),
        ]);
        const materialDiff = Array.from(allMaterialNames).map(name => {
          const inA = materialsA.find((m: any) => (m.materialName || m.name) === name);
          const inB = materialsB.find((m: any) => (m.materialName || m.name) === name);
          return {
            name,
            quantityA: inA?.quantity || 0,
            quantityB: inB?.quantity || 0,
            diff: (inB?.quantity || 0) - (inA?.quantity || 0),
            onlyIn: !inA ? "B" : !inB ? "A" : "both",
          };
        });

        return {
          success: true,
          data: {
            formulaA: { id: formulaA.id, name: formulaA.name, finishedWeight: formulaA.finished_weight },
            formulaB: { id: formulaB.id, name: formulaB.name, finishedWeight: formulaB.finished_weight },
            nutritionA,
            nutritionB,
            materialDiff,
          },
        };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "配方对比失败" };
      }
    },
  });

  toolRegistry.register({
    name: "suggest_material_substitute",
    description: "为指定原料提供替代建议，基于同类型原料的营养成分相似度和用量范围进行排序",
    paramsSchema: z.object({
      material_name: z.string().describe("需要替代的原料名称"),
      quantity: z.number().positive().optional().describe("当前用量(克)"),
    }),
    handler: async (params, context) => {
      try {
        const db = getDb();
        const material = db
          .prepare("SELECT * FROM materials WHERE name LIKE ? LIMIT 1")
          .get(`%${params.material_name}%`) as any;
        if (!material) return { success: false, error: `未找到原料"${params.material_name}"` };

        const candidates = db
          .prepare(
            "SELECT id, name, material_type, unit_price, stock FROM materials WHERE material_type = ? AND id != ? ORDER BY name",
          )
          .all(material.material_type, material.id) as any[];

        if (candidates.length === 0) {
          return {
            success: true,
            data: { original: material.name, substitutes: [], message: "没有找到同类型的替代原料" },
          };
        }

        const substitutes = candidates.slice(0, 5).map(c => ({
          id: c.id,
          name: c.name,
          type: c.material_type,
          unitPrice: c.unit_price,
          stock: c.stock,
          suggestedQuantity: params.quantity || 0,
          similarity: c.material_type === material.material_type ? "高" : "中",
        }));

        return {
          success: true,
          data: {
            original: {
              id: material.id,
              name: material.name,
              type: material.material_type,
              unitPrice: material.unit_price,
            },
            substitutes,
          },
        };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "替代建议查询失败" };
      }
    },
  });

  toolRegistry.register({
    name: "generate_quotation",
    description: "为指定配方生成智能报价单，包含原料明细、成本计算和建议售价",
    paramsSchema: z.object({
      formula_id: z.string().optional().describe("配方ID"),
      formula_name: z.string().optional().describe("配方名称（与ID二选一）"),
      profit_margin_percent: z.number().min(0).max(200).optional().default(20).describe("利润率(%)"),
      packaging_cost: z.number().nonnegative().optional().default(0).describe("包装成本(元)"),
    }),
    handler: async (params, context) => {
      try {
        const db = getDb();
        let formula: any = null;

        if (params.formula_id) {
          formula = db.prepare("SELECT * FROM formulas WHERE id = ?").get(params.formula_id) as any;
        } else if (params.formula_name) {
          formula = db
            .prepare("SELECT * FROM formulas WHERE name LIKE ? LIMIT 1")
            .get(`%${params.formula_name}%`) as any;
        }

        if (!formula) return { success: false, error: "未找到指定配方，请提供配方ID或名称" };

        const materials =
          typeof formula.materials_json === "string"
            ? JSON.parse(formula.materials_json)
            : formula.materials_json || [];

        const costMaterials = [];
        for (const m of materials) {
          const matName = m.materialName || m.name;
          const dbMat = db.prepare("SELECT unit_price FROM materials WHERE name = ?").get(matName) as any;
          costMaterials.push({
            name: matName,
            quantity: m.quantity,
            unitPrice: dbMat?.unit_price || 0,
            subtotal: 0,
          });
        }

        const costResult = costCalculator.calculate({
          materials: costMaterials,
          packaging_cost: params.packaging_cost || 0,
          other_costs: 0,
          profit_margin_percent: params.profit_margin_percent || 20,
        });

        const unitCost = formula.finished_weight
          ? costCalculator.calculatePerUnit(costResult, formula.finished_weight)
          : null;

        return {
          success: true,
          data: {
            formula: { id: formula.id, name: formula.name, finishedWeight: formula.finished_weight },
            costBreakdown: costResult,
            unitCost,
            profitMargin: params.profit_margin_percent || 20,
          },
        };
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "报价单生成失败" };
      }
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
