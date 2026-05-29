import { Router } from "express";
import { authMiddleware, requirePermission } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import {
  getAllRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
  getRolePermissions,
  updateRolePermissions,
} from "../controllers/roleController.js";

export const roleRoutes = Router();

roleRoutes.use(authMiddleware);

roleRoutes.get("/", getAllRoles);
roleRoutes.get("/:id", getRoleById);
roleRoutes.post(
  "/",
  requirePermission("permission:write"),
  validateBody({
    name: { type: "string", required: true, minLength: 1, message: "角色名称为必填项" },
    roleKey: { type: "string", required: true, minLength: 1, message: "角色标识为必填项" },
  }),
  createRole,
);
roleRoutes.put(
  "/:id",
  requirePermission("permission:write"),
  validateBody({
    name: { type: "string", required: true, minLength: 1, message: "角色名称为必填项" },
  }),
  updateRole,
);
roleRoutes.delete("/:id", requirePermission("permission:write"), deleteRole);
roleRoutes.get("/:id/permissions", getRolePermissions);
roleRoutes.put(
  "/:id/permissions",
  requirePermission("permission:write"),
  validateBody({
    permissionIds: { type: "array", required: true, message: "权限ID列表为必填项" },
  }),
  updateRolePermissions,
);
