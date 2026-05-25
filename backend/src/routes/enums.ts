import { Router } from "express";
import { authMiddleware, requirePermission } from "../middleware/auth.js";
import {
  getAllEnums,
  getEnumsByCategory,
  createEnumOption,
  updateEnumOption,
  deleteEnumOption,
} from "../controllers/enumController.js";
import { validateBody } from "../middleware/validate.js";

export const enumRoutes = Router();

enumRoutes.use(authMiddleware);

enumRoutes.get("/", getAllEnums);
enumRoutes.get("/:category", getEnumsByCategory);
enumRoutes.post(
  "/",
  requirePermission("admin"),
  validateBody({
    category: { type: "string", required: true, message: "请输入枚举分类" },
    label: { type: "string", required: true, minLength: 1, maxLength: 20, message: "请输入显示文本（1-20字符）" },
    value: { type: "string", required: true, minLength: 1, maxLength: 20, message: "请输入存储值（1-20字符）" },
  }),
  createEnumOption,
);
enumRoutes.put(
  "/:id",
  requirePermission("admin"),
  updateEnumOption,
);
enumRoutes.delete(
  "/:id",
  requirePermission("admin"),
  deleteEnumOption,
);
