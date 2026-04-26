// 原料路由
import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  getMaterials,
  getMaterial,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  getNextCode,
  getMaterialStats,
} from "../controllers/materialController.js";
import { validateBody } from "../middleware/validate.js";

export const materialRoutes = Router();

materialRoutes.use(authMiddleware);

materialRoutes.get("/", getMaterials);
materialRoutes.get("/stats", getMaterialStats);
materialRoutes.get("/next-code", getNextCode);
materialRoutes.get("/:id", getMaterial);
materialRoutes.post(
  "/",
  validateBody({
    name: { type: "string", required: true, minLength: 1, message: "请输入原料名称" },
    code: { type: "string", required: true, minLength: 1, message: "请输入原料编码" },
  }),
  createMaterial,
);
materialRoutes.put("/:id", updateMaterial);
materialRoutes.delete("/:id", deleteMaterial);
