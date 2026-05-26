// 快速配方路由
import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import {
  getQuickFormulas,
  getQuickFormulaById,
  createQuickFormula,
  updateQuickFormula,
  deleteQuickFormula,
  publishQuickFormula,
} from "../controllers/quickFormulaController.js";

export const quickFormulaRoutes = Router();

quickFormulaRoutes.use(authMiddleware);

quickFormulaRoutes.get("/", getQuickFormulas);
quickFormulaRoutes.get("/:id", getQuickFormulaById);
quickFormulaRoutes.post(
  "/",
  validateBody({
    name: { type: "string", required: true, minLength: 1, maxLength: 100, message: "请输入快速配方名称（1-100字符）" },
  }),
  createQuickFormula,
);
quickFormulaRoutes.put(
  "/:id",
  validateBody({
    name: { type: "string", required: false, minLength: 1, maxLength: 100, message: "快速配方名称为1-100字符" },
    ratioFactor: { type: "number", required: false, min: 0.15, max: 0.25, message: "主料含量比系数范围为0.15-0.25" },
    supplementRatioFactor: { type: "number", required: false, min: 0.5, max: 1.5, message: "辅料含量比系数范围为0.5-1.5" },
    finishedWeight: { type: "number", required: false, message: "成品重量必须为数字" },
    materials: { type: "array", required: false, minLength: 1, message: "请添加至少一种原料" },
    packagingPrice: { type: "number", required: false, message: "包装费用必须为数字" },
    otherPrice: { type: "number", required: false, message: "其他费用必须为数字" },
    profitMargin: { type: "number", required: false, message: "利润率必须为数字" },
    description: { type: "string", required: false, message: "描述必须为字符串" },
    preparationMethod: { type: "string", required: false, message: "制法必须为字符串" },
    salesmanId: { type: "string", required: false, message: "业务员ID必须为字符串" },
    salesmanName: { type: "string", required: false, message: "业务员名称必须为字符串" },
  }),
  updateQuickFormula,
);
quickFormulaRoutes.delete("/:id", deleteQuickFormula);
quickFormulaRoutes.post(
  "/:id/publish",
  validateBody({
    salesmanId: { type: "string", required: true, message: "请选择业务员" },
    description: { type: "string", required: true, message: "请输入配方描述" },
    preparationMethod: { type: "string", required: false, message: "制法必须为字符串" },
  }),
  publishQuickFormula,
);
