// 配方路由
import { Router, Request, Response, NextFunction } from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  getFormulas,
  getFormula,
  createFormula,
  updateFormula,
  deleteFormula,
  publishFormula,
  getFormulasByMaterial,
  getPriceQuote,
  validateFormulaRatio,
} from "../controllers/formulaController.js";
import { validateBody } from "../middleware/validate.js";
import { fail } from "../utils/helpers.js";

/** 校验 materials 数组子项的必要字段 */
function validateMaterialItems(req: Request, res: Response, next: NextFunction): void {
  const materials = req.body.materials;
  if (!Array.isArray(materials)) {
    next();
    return;
  }
  if (materials.length === 0) {
    res.status(400).json({
      success: false,
      error: { message: "原料列表不能为空", code: "VALIDATION_ERROR", timestamp: new Date().toISOString() },
    });
    return;
  }
  const errors: string[] = [];
  materials.forEach((item: Record<string, unknown>, index: number) => {
    if (!item.materialId || typeof item.materialId !== "string") {
      errors.push(`原料第${index + 1}项缺少 materialId`);
    }
    if (item.quantity === undefined || typeof item.quantity !== "number" || item.quantity <= 0) {
      errors.push(`原料第${index + 1}项 quantity 必须为正数`);
    }
  });
  if (errors.length > 0) {
    res.status(400).json({
      ...fail("参数验证失败", "VALIDATION_ERROR"),
      details: errors,
    });
    return;
  }
  next();
}

export const formulaRoutes = Router();

formulaRoutes.use(authMiddleware);

formulaRoutes.get("/", getFormulas);
formulaRoutes.get("/by-material/:materialId", getFormulasByMaterial);
formulaRoutes.post(
  "/validate-ratio",
  validateBody({
    materials: { type: "array", required: true, message: "请提供原料列表" },
    finishedWeight: { type: "number", required: true, message: "请提供成品重量" },
    ratioFactor: { type: "number", required: true, message: "请提供主料含量比系数" },
    supplementRatioFactor: { type: "number", required: true, message: "请提供辅料含量比系数" },
  }),
  validateFormulaRatio,
);
formulaRoutes.get("/:id", getFormula);
formulaRoutes.post(
  "/",
  validateBody({
    name: { type: "string", required: true, minLength: 1, message: "请输入配方名称" },
    salesmanId: { type: "string", required: true, message: "请选择业务员" },
    materials: { type: "array", required: true, message: "请添加原料" },
    finishedWeight: { type: "number", required: true, message: "请输入成品重量" },
    ratioFactor: { type: "number", required: true, min: 0.15, max: 0.25, message: "主料含量比系数范围为0.15-0.25" },
    supplementRatioFactor: {
      type: "number",
      required: true,
      min: 0.5,
      max: 1.5,
      message: "辅料含量比系数范围为0.5-1.5",
    },
    packagingPrice: { type: "number", required: false, message: "包材费用格式不正确" },
    otherPrice: { type: "number", required: false, message: "其他费用格式不正确" },
    profitMargin: { type: "number", required: false, message: "利润率格式不正确" },
    description: { type: "string", required: false, message: "描述格式不正确" },
    preparationMethod: { type: "string", required: false, message: "制法格式不正确" },
    originalName: { type: "string", required: false, message: "原始配方名格式不正确" },
    originalWeight: { type: "number", required: false, message: "原始重量格式不正确" },
    parseResultId: { type: "string", required: false, message: "解析结果ID格式不正确" },
  }),
  validateMaterialItems,
  createFormula,
);
formulaRoutes.put(
  "/:id",
  validateBody({
    name: { type: "string", required: false, minLength: 1, message: "请输入配方名称" },
    salesmanId: { type: "string", required: false, message: "业务员ID格式不正确" },
    materials: { type: "array", required: false, message: "原料列表格式不正确" },
    finishedWeight: { type: "number", required: false, message: "请输入成品重量" },
    ratioFactor: { type: "number", required: false, min: 0.15, max: 0.25, message: "主料含量比系数范围为0.15-0.25" },
    supplementRatioFactor: {
      type: "number",
      required: false,
      min: 0.5,
      max: 1.5,
      message: "辅料含量比系数范围为0.5-1.5",
    },
    packagingPrice: { type: "number", required: false, message: "包材费用格式不正确" },
    otherPrice: { type: "number", required: false, message: "其他费用格式不正确" },
    profitMargin: { type: "number", required: false, message: "利润率格式不正确" },
    description: { type: "string", required: false, message: "描述格式不正确" },
    preparationMethod: { type: "string", required: false, message: "制法格式不正确" },
    versionReason: { type: "string", required: false, message: "升版原因格式不正确" },
  }),
  validateMaterialItems,
  updateFormula,
);
formulaRoutes.delete("/:id", deleteFormula);
formulaRoutes.put("/:id/publish", publishFormula);
formulaRoutes.get("/:id/price-quote", getPriceQuote);
