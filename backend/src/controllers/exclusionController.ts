import { Response } from "express";
import { success } from "../utils/helpers.js";
import { AuthRequest } from "../middleware/auth.js";
import * as exclusionService from "../services/exclusionService.js";

type CodedError = Error & { code: string };

function isCodedError(error: unknown): error is CodedError {
  return error instanceof Error && "code" in error;
}

export async function getAllExclusions(_req: AuthRequest, res: Response) {
  try {
    const data = await exclusionService.getAllExclusions();
    res.json(success(data));
  } catch (error: unknown) {
    console.error("[ExclusionController] getAllExclusions Error:", error);
    res.status(500).json({
      success: false,
      error: { message: "获取互斥规则失败", code: "INTERNAL_ERROR" },
    });
  }
}

export async function createExclusion(req: AuthRequest, res: Response) {
  try {
    const data = await exclusionService.createExclusion({
      category: req.body.category,
      valueA: req.body.valueA,
      valueB: req.body.valueB,
    });
    res.status(201).json(success(data, "互斥规则创建成功"));
  } catch (error: unknown) {
    if (isCodedError(error)) {
      if (error.code === "VALIDATION_ERROR") {
        res.status(400).json({
          success: false,
          error: { message: error.message, code: "VALIDATION_ERROR" },
        });
        return;
      }
      if (error.code === "DUPLICATE_ENTRY") {
        res.status(409).json({
          success: false,
          error: { message: error.message, code: "DUPLICATE_ENTRY" },
        });
        return;
      }
    }
    console.error("[ExclusionController] createExclusion Error:", error);
    res.status(500).json({
      success: false,
      error: { message: "创建互斥规则失败", code: "INTERNAL_ERROR" },
    });
  }
}

export async function deleteExclusion(req: AuthRequest, res: Response) {
  try {
    const { id } = req.params;
    const result = await exclusionService.deleteExclusion(id);
    res.json(success(result, "互斥规则删除成功"));
  } catch (error: unknown) {
    if (isCodedError(error) && error.code === "NOT_FOUND") {
      res.status(404).json({
        success: false,
        error: { message: error.message, code: "NOT_FOUND" },
      });
      return;
    }
    console.error("[ExclusionController] deleteExclusion Error:", error);
    res.status(500).json({
      success: false,
      error: { message: "删除互斥规则失败", code: "INTERNAL_ERROR" },
    });
  }
}
