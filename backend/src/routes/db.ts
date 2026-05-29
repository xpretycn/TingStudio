import { Router } from "express";
import multer from "multer";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import * as dbController from "../controllers/dbController.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.originalname.endsWith(".json")) {
      cb(null, true);
    } else {
      cb(new Error("仅支持 .json 格式的备份文件"));
    }
  },
});

export const dbRoutes = Router();

dbRoutes.use(authMiddleware);
dbRoutes.use((req: AuthRequest, res, next) => {
  if (req.user?.role !== "admin") {
    res.status(403).json({ success: false, error: { message: "仅管理员可访问数据库管理功能", code: "FORBIDDEN" } });
    return;
  }
  next();
});

dbRoutes.get("/info", dbController.getDbInfo);
dbRoutes.get("/tables", dbController.getTableList);
dbRoutes.get("/tables/:tableName/schema", dbController.getTableSchema);
dbRoutes.get("/tables/:tableName/data", dbController.getTableData);
dbRoutes.get("/backups", dbController.getBackupList);
dbRoutes.post("/backups", dbController.createBackup);
dbRoutes.get("/backups/:fileName/download", dbController.downloadBackup);
dbRoutes.post("/backups/:fileName/restore", dbController.restoreBackup);
dbRoutes.delete("/backups/:fileName", dbController.deleteBackup);
dbRoutes.post("/backups/upload-restore", upload.single("backup"), dbController.uploadAndRestore);
dbRoutes.get("/scripts", dbController.getScriptList);
dbRoutes.post("/scripts/:scriptId/execute", dbController.executeScript);
dbRoutes.get("/scripts/:scriptId/history", dbController.getScriptHistory);
