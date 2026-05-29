import { Router } from "express";
import { authMiddleware, requirePermission } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { getUserList, updateUserRole, updateUserStatus } from "../controllers/userController.js";

export const userRoutes = Router();

userRoutes.use(authMiddleware);

userRoutes.get("/", requirePermission("user:read"), getUserList);
userRoutes.put(
  "/:id/role",
  requirePermission("user:write"),
  validateBody({
    roleId: { type: "string", required: true, minLength: 1, message: "角色ID为必填项" },
  }),
  updateUserRole,
);
userRoutes.put(
  "/:id/status",
  requirePermission("user:write"),
  validateBody({
    isActive: { type: "number", required: true, message: "状态值为必填项" },
  }),
  updateUserStatus,
);
