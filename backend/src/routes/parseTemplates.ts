import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  getParseTemplates,
  getParseTemplate,
  createParseTemplate,
  updateParseTemplate,
  deleteParseTemplate,
} from "../controllers/parseTemplateController.js";
import { validateBody } from "../middleware/validate.js";

export const parseTemplateRoutes = Router();

parseTemplateRoutes.use(authMiddleware);

parseTemplateRoutes.get("/", getParseTemplates);
parseTemplateRoutes.get("/:id", getParseTemplate);
parseTemplateRoutes.post(
  "/",
  validateBody({
    name: { type: "string", required: true, minLength: 1, message: "请输入模板名称" },
    category: { type: "string", required: false, message: "模板分类" },
    defaultProvider: { type: "string", required: false },
    defaultModel: { type: "string", required: false },
    customPrompt: { type: "string", required: false },
    fieldMapping: { type: "object", required: false },
    validationRules: { type: "object", required: false },
  }),
  createParseTemplate,
);
parseTemplateRoutes.put(
  "/:id",
  validateBody({
    name: { type: "string", required: false },
    category: { type: "string", required: false },
    defaultProvider: { type: "string", required: false },
    defaultModel: { type: "string", required: false },
    customPrompt: { type: "string", required: false },
    fieldMapping: { type: "object", required: false },
    validationRules: { type: "object", required: false },
    isActive: { type: "boolean", required: false },
  }),
  updateParseTemplate,
);
parseTemplateRoutes.delete("/:id", deleteParseTemplate);
