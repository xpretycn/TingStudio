import { Response } from "express";
import { success } from "../utils/helpers.js";
import {
  listSnapshots,
  getSnapshot,
  type SnapshotActionType,
} from "../services/nutritionSourceSnapshot.js";
import { logger } from "../utils/logger.js";
import type { AuthRequest } from "../types/auth.js";

const ACTION_LABELS: Record<SnapshotActionType, string> = {
  batch_set_authoritative: "批量设为主用",
  batch_archive: "批量归档",
  batch_restore: "批量恢复",
  manual_set: "手动设定",
  import: "数据导入",
};

export async function listMaterialSnapshots(req: AuthRequest, res: Response) {
  try {
    const { materialId } = req.params;
    const limit = Math.min(Math.max(Number(req.query.limit ?? 50), 1), 200);
    const snapshots = await listSnapshots(materialId, limit);
    res.json(
      success({
        materialId,
        snapshots: snapshots.map((s) => ({
          ...s,
          actionLabel: ACTION_LABELS[s.action] ?? s.action,
        })),
      }),
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error("[Snapshot] listMaterialSnapshots error:", msg);
    res.status(500).json({
      success: false,
      error: { message: "操作失败", code: "INTERNAL_ERROR", timestamp: new Date().toISOString() },
    });
  }
}

export async function getSnapshotDetail(req: AuthRequest, res: Response) {
  try {
    const { snapshotId } = req.params;
    const snapshot = await getSnapshot(snapshotId);
    if (!snapshot) {
      res.status(404).json({ success: false, message: "快照不存在" });
      return;
    }
    res.json(
      success({
        ...snapshot,
        actionLabel: ACTION_LABELS[snapshot.action] ?? snapshot.action,
      }),
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    logger.error("[Snapshot] getSnapshotDetail error:", msg);
    res.status(500).json({
      success: false,
      error: { message: "操作失败", code: "INTERNAL_ERROR", timestamp: new Date().toISOString() },
    });
  }
}
