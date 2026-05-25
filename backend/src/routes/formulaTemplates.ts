// 配方模板路由
import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import {
  getTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "../controllers/formulaTemplateController.js";

export const formulaTemplateRoutes = Router();

formulaTemplateRoutes.use(authMiddleware);

formulaTemplateRoutes.get("/", getTemplates);
formulaTemplateRoutes.get("/:id", getTemplateById);
formulaTemplateRoutes.post(
  "/",
  validateBody({
    name: { type: "string", required: true, minLength: 1, message: "请输入模板名称" },
    ratioFactor: { type: "number", required: true, min: 0.15, max: 0.25, message: "主料含量比系数范围为0.15-0.25" },
    supplementRatioFactor: { type: "number", required: true, min: 0.5, max: 1.5, message: "辅料含量比系数范围为0.5-1.5" },
    finishedWeight: { type: "number", required: true, min: 0.01, message: "成品重量必须大于0" },
    materials: { type: "array", required: true, minLength: 1, message: "请添加至少一种原料" },
    packagingPrice: { type: "number", required: false, message: "包装费用必须为数字" },
    otherPrice: { type: "number", required: false, message: "其他费用必须为数字" },
    profitMargin: { type: "number", required: false, message: "利润率必须为数字" },
    description: { type: "string", required: false, message: "描述必须为字符串" },
  }),
  createTemplate,
);
formulaTemplateRoutes.put(
  "/:id",
  validateBody({
    name: { type: "string", required: false, minLength: 1, message: "请输入模板名称" },
    ratioFactor: { type: "number", required: false, min: 0.15, max: 0.25, message: "主料含量比系数范围为0.15-0.25" },
    supplementRatioFactor: { type: "number", required: false, min: 0.5, max: 1.5, message: "辅料含量比系数范围为0.5-1.5" },
    finishedWeight: { type: "number", required: false, min: 0.01, message: "成品重量必须大于0" },
    materials: { type: "array", required: false, minLength: 1, message: "请添加至少一种原料" },
    packagingPrice: { type: "number", required: false, message: "包装费用必须为数字" },
    otherPrice: { type: "number", required: false, message: "其他费用必须为数字" },
    profitMargin: { type: "number", required: false, message: "利润率必须为数字" },
    description: { type: "string", required: false, message: "描述必须为字符串" },
  }),
  updateTemplate,
);
formulaTemplateRoutes.delete("/:id", deleteTemplate);
