// AI 助手路由
import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import multer from "multer";
import {
  parseFormula,
  parseMaterialNutrition,
  naturalSearch,
  getModels,
  chatStream,
} from "../controllers/aiController.js";
import {
  getModelsList,
  createModel,
  updateModel,
  deleteModel,
  testModelConnection,
  getModelVersions,
  getModelVersionsByProvider,
  getUsageStats,
  getUsageLogs,
  getAlertConfigs,
  updateAlertConfig,
  getAlertRecords,
  getHealthStatus,
  getHealthHistory,
  setFallback,
  switchModelVersion,
  getModelApplications,
  createModelApplication,
  updateModelApplication,
  patchModelApplication,
  deleteModelApplication,
} from "../controllers/modelController.js";

const router = Router();

function getUpload() {
  const uploadDir = process.env.UPLOAD_DIR || "./uploads/";
  return multer({
    dest: uploadDir,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = [
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "text/csv",
        "image/png",
        "image/jpeg",
        "image/gif",
        "image/webp",
      ];
      const ext = file.originalname.toLowerCase();
      const allowedExts = [".xlsx", ".xls", ".csv", ".png", ".jpg", ".jpeg", ".gif", ".webp"];
      if (allowed.includes(file.mimetype) || allowedExts.some(e => ext.endsWith(e))) {
        cb(null, true);
      } else {
        cb(new Error("不支持的文件格式，请上传 Excel 或图片文件"));
      }
    },
  });
}

router.use(authMiddleware);

router.post("/parse-formula", (req, res, next) => getUpload().single("file")(req, res, next), parseFormula);
router.post(
  "/parse-material-nutrition",
  (req, res, next) => getUpload().single("file")(req, res, next),
  parseMaterialNutrition,
);
router.post("/natural-search", naturalSearch);
router.get("/export/:filename", async (req: any, res: any) => {
  try {
    const { filename } = req.params;
    const { getDb } = await import("../config/database-better-sqlite3.js");
    const db = getDb();
    const record = db.prepare("SELECT * FROM search_export_cache WHERE filename = ?").get(filename) as any;
    if (!record) {
      res.status(404).json({ success: false, message: "导出文件不存在或已过期" });
      return;
    }
    if (new Date(record.expires_at) < new Date()) {
      res.status(410).json({ success: false, message: "导出文件已过期" });
      return;
    }
    const fs = await import("fs");
    if (!fs.existsSync(record.file_path)) {
      res.status(404).json({ success: false, message: "文件不存在" });
      return;
    }
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    fs.createReadStream(record.file_path).pipe(res);
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});
router.get("/models", getModels);

// AI 对话（SSE 流式）
router.post("/chat", chatStream);

router.get("/models-manage", getModelsList);
router.post("/models-manage", createModel);
router.put("/models-manage/:id", updateModel);
router.delete("/models-manage/:id", deleteModel);
router.post("/models-manage/:id/test", testModelConnection);
router.get("/models-manage/:id/versions", getModelVersions);
router.get("/models/:provider/versions", getModelVersionsByProvider);
router.put("/models/:provider/version", switchModelVersion);
router.put("/models-manage/:id/fallback", setFallback);

router.get("/usage", getUsageStats);
router.get("/usage/logs", getUsageLogs);

router.get("/alerts/configs", getAlertConfigs);
router.put("/alerts/configs/:id", updateAlertConfig);
router.get("/alerts/records", getAlertRecords);

router.get("/health", getHealthStatus);
router.get("/health/:provider/history", getHealthHistory);

router.get("/model-applications", getModelApplications);
router.post("/model-applications", createModelApplication);
router.put("/model-applications/:id", updateModelApplication);
router.patch("/model-applications/:id", patchModelApplication);
router.delete("/model-applications/:id", deleteModelApplication);

export const aiRoutes = router;
