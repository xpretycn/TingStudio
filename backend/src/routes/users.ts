import { Router } from "express";
import { authMiddleware, requirePermission } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { getUserList, updateUserRole, updateUserStatus, createUser } from "../controllers/userController.js";

export const userRoutes = Router();

userRoutes.use(authMiddleware);

userRoutes.post(
  "/",
  requirePermission("user:write"),
  validateBody({
    username: { type: "string", required: true, minLength: 2, maxLength: 50, message: "用户名长度为2-50个字符" },
    password: { type: "string", required: true, minLength: 6, message: "密码长度至少6个字符" },
    role: { type: "string", required: false, message: "角色格式不正确" },
  }),
  createUser,
);
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
