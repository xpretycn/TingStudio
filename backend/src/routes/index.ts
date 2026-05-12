// 路由汇总
import { Router } from "express";
import { authRoutes } from "./auth.js";
import { materialRoutes } from "./materials.js";
import { formulaRoutes } from "./formulas.js";
import { salesmanRoutes } from "./salesmen.js";
import { versionRoutes } from "./versions.js";
import { exportRoutes } from "./exports.js";
import { nutritionRoutes } from "./nutrition.js";
import { excelImportRoutes } from "./excelImport.js";
import { aiRoutes } from "./ai.js";
import { weatherRoutes } from "./weather.js";
import { salesRoutes } from "./sales.js";
import { reportRoutes } from "./reports.js";
import { fileRoutes } from "./files.js";
import { dashboardRoutes } from "./dashboard.js";
import { agentRouter } from "./agent.js";

export function createAppRouter(): Router {
  const router = Router();

  router.use("/auth", authRoutes);
  router.use("/materials", materialRoutes);
  router.use("/formulas", formulaRoutes);
  router.use("/salesmen", salesmanRoutes);
  router.use("/versions", versionRoutes);
  router.use("/exports", exportRoutes);
  router.use("/nutrition", nutritionRoutes);
  router.use("/import", excelImportRoutes);
  router.use("/ai", aiRoutes);
  router.use("/agent", agentRouter);
  router.use("/weather", weatherRoutes);
  router.use("/sales", salesRoutes);
  router.use("/reports", reportRoutes);
  router.use("/files", fileRoutes);
  router.use("/dashboard", dashboardRoutes);

  return router;
}
