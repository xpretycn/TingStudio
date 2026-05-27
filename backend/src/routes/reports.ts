import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  getReportList,
  getReportById,
  generateReport,
  updateReport,
  deleteReport,
  publishReport,
  getWeeklyData,
  getMonthlyData,
  getTargetList,
  createTarget,
  updateTarget,
  deleteTarget,
  exportReportPdf,
  exportReportExcel,
  batchExportExcel,
  compareReports,
  getAIAnalysis,
  saveAIAnalysis,
  checkPeriodExists,
} from "../controllers/reportController.js";
import { validateBody } from "../middleware/validate.js";

export const reportRoutes = Router();

reportRoutes.use(authMiddleware);

reportRoutes.post("/check-period", validateBody({
  type: { type: "string", required: true, message: "请选择报告类型" },
  periodStart: { type: "string", required: true, message: "请选择开始日期" },
}), checkPeriodExists);
reportRoutes.get("/data/weekly", getWeeklyData);
reportRoutes.get("/data/monthly", getMonthlyData);
reportRoutes.get("/targets", getTargetList);
reportRoutes.post("/targets", validateBody({
  periodType: { type: "string", required: true, message: "请选择周期类型" },
  periodStart: { type: "string", required: true, message: "请选择开始日期" },
  periodEnd: { type: "string", required: true, message: "请选择结束日期" },
}), createTarget);
reportRoutes.put("/targets/:id", updateTarget);
reportRoutes.delete("/targets/:id", deleteTarget);
reportRoutes.post("/compare", compareReports);
reportRoutes.post("/ai-analysis", getAIAnalysis);
reportRoutes.put("/:id/ai-analysis", saveAIAnalysis);
reportRoutes.post("/generate", validateBody({
  type: { type: "string", required: true, message: "请选择报告类型" },
  periodStart: { type: "string", required: true, message: "请选择开始日期" },
  periodEnd: { type: "string", required: true, message: "请选择结束日期" },
}), generateReport);
reportRoutes.get("/", getReportList);
reportRoutes.get("/:id", getReportById);
reportRoutes.get("/:id/export/pdf", exportReportPdf);
reportRoutes.get("/:id/export/excel", exportReportExcel);
reportRoutes.post("/batch-export/excel", validateBody({
  reportIds: { type: "array", required: true, message: "请选择要导出的报告" },
}), batchExportExcel);
reportRoutes.put("/:id", updateReport);
reportRoutes.delete("/:id", deleteReport);
reportRoutes.post("/:id/publish", publishReport);
