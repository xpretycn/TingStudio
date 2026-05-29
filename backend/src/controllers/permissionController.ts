import { Request, Response } from "express";
import { success } from "../utils/helpers.js";
import * as permissionService from "../services/permissionService.js";

export async function getAllPermissions(_req: Request, res: Response) {
  try {
    const grouped = await permissionService.getPermissionsGroupedByModule();
    res.json(success(grouped));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[PermissionController] getAllPermissions Error:", message);
    res.status(500).json({ success: false, message: "获取权限列表失败", error: message });
  }
}
