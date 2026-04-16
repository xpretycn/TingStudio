// AI 助手路由
import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import multer from "multer";
import { parseFormula, parseMaterialNutrition, naturalSearch, getModels } from "../controllers/aiController.js";

const router = Router();

// multer 配置（复用项目上传配置）
const upload = multer({
  dest: "./uploads/",
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
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

// 所有路由需要认证
router.use(authMiddleware);

// AI 解析配方（文件上传）
router.post("/parse-formula", upload.single("file"), parseFormula);

// AI 解析原料营养（文件上传）
router.post("/parse-material-nutrition", upload.single("file"), parseMaterialNutrition);

// 自然语言检索
router.post("/natural-search", naturalSearch);

// 获取可用模型列表
router.get("/models", getModels);

export const aiRoutes = router;
