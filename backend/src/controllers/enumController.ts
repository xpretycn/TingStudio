import { Response } from "express";
import { success } from "../utils/helpers.js";
import * as enumService from "../services/enumService.js";

export async function getAllEnums(req: any, res: Response) {
  try {
    const data = await enumService.getAllEnums();
    res.json(success(data));
  } catch (error: any) {
    console.error("[EnumController] getAllEnums Error:", error);
    res.status(500).json({ success: false, message: "获取枚举列表失败", error: error.message });
  }
}

export async function getEnumsByCategory(req: any, res: Response) {
  try {
    const { category } = req.params;
    const activeOnly = req.query.activeOnly === "true";
    const data = await enumService.getEnumsByCategory(category, activeOnly);
    res.json(success(data));
  } catch (error: any) {
    console.error("[EnumController] getEnumsByCategory Error:", error);
    res.status(500).json({ success: false, message: "获取枚举列表失败", error: error.message });
  }
}

export async function createEnumOption(req: any, res: Response) {
  try {
    const data = await enumService.createEnumOption(req.body);
    res.status(201).json(success(data, "枚举选项创建成功"));
  } catch (error: any) {
    if (error.code === "DUPLICATE_ENTRY") {
      res.status(409).json({ success: false, error: { message: error.message, code: "DUPLICATE_ENTRY" } });
      return;
    }
    if (error.message === "无效的枚举分类") {
      res.status(400).json({ success: false, error: { message: error.message, code: "VALIDATION_ERROR" } });
      return;
    }
    console.error("[EnumController] createEnumOption Error:", error);
    res.status(500).json({ success: false, message: "创建枚举选项失败", error: error.message });
  }
}

export async function updateEnumOption(req: any, res: Response) {
  try {
    const { id } = req.params;
    const data = await enumService.updateEnumOption(id, req.body);
    res.json(success(data, "枚举选项更新成功"));
  } catch (error: any) {
    if (error.code === "NOT_FOUND") {
      res.status(404).json({ success: false, error: { message: error.message, code: "NOT_FOUND" } });
      return;
    }
    if (error.code === "DUPLICATE_ENTRY") {
      res.status(409).json({ success: false, error: { message: error.message, code: "DUPLICATE_ENTRY" } });
      return;
    }
    console.error("[EnumController] updateEnumOption Error:", error);
    res.status(500).json({ success: false, message: "更新枚举选项失败", error: error.message });
  }
}

export async function deleteEnumOption(req: any, res: Response) {
  try {
    const { id } = req.params;
    const result = await enumService.deleteEnumOption(id);
    res.json(success(result, "枚举选项删除成功"));
  } catch (error: any) {
    if (error.code === "NOT_FOUND") {
      res.status(404).json({ success: false, error: { message: error.message, code: "NOT_FOUND" } });
      return;
    }
    console.error("[EnumController] deleteEnumOption Error:", error);
    res.status(500).json({ success: false, message: "删除枚举选项失败", error: error.message });
  }
}
