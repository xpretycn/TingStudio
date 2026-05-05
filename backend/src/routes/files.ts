import { Router } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth.js";
import {
  listFiles,
  getStats,
  uploadFile,
  batchDelete,
  batchArchive,
  getFile,
  previewFile,
  getThumbnail,
  downloadFile,
  getFileAuditLog,
  linkFile,
  unlinkFile,
  getFileRelations,
  reparseFile,
  deleteFile,
  fixGarbledFilenames,
} from "../controllers/fileController.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { generateId, fixMulterOriginalname } from "../utils/helpers.js";

const storage = multer.diskStorage({
  destination(req, _file, cb) {
    const fileType = (req as any).body?.fileType || "other";
    const now = new Date();
    const yyyy = now.getFullYear().toString();
    const mm = (now.getMonth() + 1).toString().padStart(2, "0");
    const dir = path.join(process.cwd(), "data", "uploads", fileType, `${yyyy}-${mm}`);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname);
    const uuid8 = generateId().substring(0, 8);
    cb(null, `${uuid8}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    file.originalname = fixMulterOriginalname(file.originalname);
    const allowed = [".xlsx", ".xls", ".csv", ".png", ".jpg", ".jpeg", ".gif", ".webp"];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("不支持的文件类型"));
    }
  },
});

export const fileRoutes = Router();

fileRoutes.use(authMiddleware);

fileRoutes.get("/", listFiles);
fileRoutes.get("/stats", getStats);
fileRoutes.post("/upload", upload.single("file"), uploadFile);
fileRoutes.post("/batch-delete", batchDelete);
fileRoutes.post("/batch-archive", batchArchive);
fileRoutes.post("/fix-garbled", fixGarbledFilenames);
fileRoutes.get("/:fileId", getFile);
fileRoutes.get("/:fileId/preview", previewFile);
fileRoutes.get("/:fileId/thumbnail", getThumbnail);
fileRoutes.get("/:fileId/download", downloadFile);
fileRoutes.get("/:fileId/audit", getFileAuditLog);
fileRoutes.post("/:fileId/link", linkFile);
fileRoutes.post("/:fileId/unlink", unlinkFile);
fileRoutes.get("/:fileId/relations", getFileRelations);
fileRoutes.post("/:fileId/reparse", reparseFile);
fileRoutes.delete(
  "/:fileId",
  (req: AuthRequest, res, next) => {
    if (req.user?.role !== "admin") {
      res.status(403).json({ success: false, message: "仅管理员可执行此操作" });
      return;
    }
    next();
  },
  deleteFile,
);
