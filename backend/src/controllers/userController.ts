import { Request, Response } from "express";
import { success, successWithPagination } from "../utils/helpers.js";
import * as userService from "../services/userService.js";

interface AuthUser {
  userId: string;
}

export async function getUserList(req: AuthUser & Request, res: Response) {
  try {
    const { keyword, roleId, isActive, page, pageSize } = req.query;
    const result = await userService.getUserList({
      keyword: keyword as string | undefined,
      roleId: roleId as string | undefined,
      isActive: isActive !== undefined ? Number(isActive) : undefined,
      page: page !== undefined ? Number(page) : undefined,
      pageSize: pageSize !== undefined ? Number(pageSize) : undefined,
    });

    res.json(
      successWithPagination(result.list, result.pagination.total, result.pagination.page, result.pagination.pageSize)
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[UserController] getUserList Error:", message);
    res.status(500).json({ success: false, message: "获取用户列表失败", error: message });
  }
}

export async function updateUserRole(req: AuthUser & Request, res: Response) {
  try {
    const { id } = req.params;
    const { roleId } = req.body;
    const user = await userService.updateUserRole(id, roleId);
    res.json(success(user, "用户角色更新成功"));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "NOT_FOUND") {
      res.status(404).json({ success: false, message: "目标角色不存在", code: "NOT_FOUND" });
      return;
    }
    console.error("[UserController] updateUserRole Error:", message);
    res.status(500).json({ success: false, message: "更新用户角色失败", error: message });
  }
}

export async function updateUserStatus(req: AuthUser & Request, res: Response) {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const currentUserId = req.user?.userId;

    if (!currentUserId) {
      res.status(401).json({ success: false, message: "未认证", code: "UNAUTHORIZED" });
      return;
    }

    await userService.toggleUserActive(id, isActive ? 1 : 0, currentUserId);
    res.json(success(null, "用户状态更新成功"));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "NOT_FOUND") {
      res.status(404).json({ success: false, message: "用户不存在", code: "NOT_FOUND" });
      return;
    }
    if (message === "CANNOT_DISABLE_SELF") {
      res.status(400).json({ success: false, message: "不能禁用当前登录账号", code: "CANNOT_DISABLE_SELF" });
      return;
    }
    if (message === "CANNOT_DISABLE_ADMIN") {
      res.status(400).json({ success: false, message: "不能禁用管理员账号", code: "CANNOT_DISABLE_ADMIN" });
      return;
    }
    console.error("[UserController] updateUserStatus Error:", message);
    res.status(500).json({ success: false, message: "更新用户状态失败", error: message });
  }
}
