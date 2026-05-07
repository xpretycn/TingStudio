// AI 助手路由
import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import multer from "multer";
import { parseFormula, parseMaterialNutrition, naturalSearch, getModels } from "../controllers/aiController.js";
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
router.get("/models", getModels);

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

export const aiRoutes = router;
