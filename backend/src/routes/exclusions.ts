import { Router } from "express";
import { authMiddleware, requirePermission } from "../middleware/auth.js";
import {
  getAllExclusions,
  createExclusion,
  deleteExclusion,
} from "../controllers/exclusionController.js";
import { validateBody } from "../middleware/validate.js";

export const exclusionRoutes = Router();

exclusionRoutes.use(authMiddleware);

exclusionRoutes.get("/", getAllExclusions);

exclusionRoutes.post(
  "/",
  requirePermission("admin"),
  validateBody({
    category: { type: "string", required: true, message: "请输入互斥规则分类" },
    valueA: { type: "string", required: true, message: "请输入选项A" },
    valueB: { type: "string", required: true, message: "请输入选项B" },
  }),
  createExclusion,
);

exclusionRoutes.delete(
  "/:id",
  requirePermission("admin"),
  deleteExclusion,
);
