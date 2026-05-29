import { Request, Response } from "express";
import { success } from "../utils/helpers.js";
import * as roleService from "../services/roleService.js";

export async function getAllRoles(_req: Request, res: Response) {
  try {
    const roles = await roleService.getAllRoles();
    res.json(success(roles));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[RoleController] getAllRoles Error:", message);
    res.status(500).json({ success: false, message: "获取角色列表失败", error: message });
  }
}

export async function getRoleById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const role = await roleService.getRoleById(id);
    if (!role) {
      res.status(404).json({ success: false, message: "角色不存在", code: "NOT_FOUND" });
      return;
    }
    res.json(success(role));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[RoleController] getRoleById Error:", message);
    res.status(500).json({ success: false, message: "获取角色详情失败", error: message });
  }
}

export async function createRole(req: Request, res: Response) {
  try {
    const { name, roleKey, description } = req.body;
    const role = await roleService.createRole({ name, roleKey, description });
    res.status(201).json(success(role, "角色创建成功"));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "DUPLICATE_ENTRY") {
      res.status(409).json({ success: false, message: "角色标识已存在", code: "DUPLICATE_ENTRY" });
      return;
    }
    console.error("[RoleController] createRole Error:", message);
    res.status(500).json({ success: false, message: "创建角色失败", error: message });
  }
}

export async function updateRole(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const role = await roleService.updateRole(id, { name, description });
    res.json(success(role, "角色更新成功"));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "NOT_FOUND") {
      res.status(404).json({ success: false, message: "角色不存在", code: "NOT_FOUND" });
      return;
    }
    if (message === "FORBIDDEN") {
      res.status(403).json({ success: false, message: "不允许修改系统管理员角色", code: "FORBIDDEN" });
      return;
    }
    console.error("[RoleController] updateRole Error:", message);
    res.status(500).json({ success: false, message: "更新角色失败", error: message });
  }
}

export async function deleteRole(req: Request, res: Response) {
  try {
    const { id } = req.params;
    await roleService.deleteRole(id);
    res.json(success(null, "角色删除成功"));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "NOT_FOUND") {
      res.status(404).json({ success: false, message: "角色不存在", code: "NOT_FOUND" });
      return;
    }
    if (message === "FORBIDDEN") {
      res.status(403).json({ success: false, message: "不允许删除系统角色", code: "FORBIDDEN" });
      return;
    }
    if (message === "ROLE_HAS_USERS") {
      res.status(400).json({ success: false, message: "该角色下还有用户，无法删除", code: "ROLE_HAS_USERS" });
      return;
    }
    console.error("[RoleController] deleteRole Error:", message);
    res.status(500).json({ success: false, message: "删除角色失败", error: message });
  }
}

export async function getRolePermissions(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const permissions = await roleService.getRolePermissions(id);
    res.json(success(permissions));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[RoleController] getRolePermissions Error:", message);
    res.status(500).json({ success: false, message: "获取角色权限失败", error: message });
  }
}

export async function updateRolePermissions(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { permissionIds } = req.body;
    await roleService.updateRolePermissions(id, permissionIds || []);
    res.json(success(null, "权限分配成功"));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "NOT_FOUND") {
      res.status(404).json({ success: false, message: "角色不存在", code: "NOT_FOUND" });
      return;
    }
    console.error("[RoleController] updateRolePermissions Error:", message);
    res.status(500).json({ success: false, message: "权限分配失败", error: message });
  }
}
