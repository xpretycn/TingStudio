// 配方路由
import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  getFormulas,
  getFormula,
  createFormula,
  updateFormula,
  deleteFormula,
  getFormulasByMaterial,
  getPriceQuote,
} from "../controllers/formulaController.js";
import { validateBody } from "../middleware/validate.js";

export const formulaRoutes = Router();

formulaRoutes.use(authMiddleware);

formulaRoutes.get("/", getFormulas);
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
  }),
  createFormula,
);
formulaRoutes.put(
  "/:id",
  validateBody({
    name: { type: "string", required: false, minLength: 1, message: "请输入配方名称" },
    finishedWeight: { type: "number", required: false, message: "请输入成品重量" },
    ratioFactor: { type: "number", required: false, min: 0.15, max: 0.25, message: "主料含量比系数范围为0.15-0.25" },
    supplementRatioFactor: {
      type: "number",
      required: false,
      min: 0.5,
      max: 1.5,
      message: "辅料含量比系数范围为0.5-1.5",
    },
  }),
  updateFormula,
);
formulaRoutes.delete("/:id", deleteFormula);
formulaRoutes.get("/:id/price-quote", getPriceQuote);
formulaRoutes.get("/by-material/:materialId", getFormulasByMaterial);
