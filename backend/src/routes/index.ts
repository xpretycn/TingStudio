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
import { dashboardRoutes } from "./dashboard.js";
import { agentRouter } from "./agent.js";
import { parseTemplateRoutes } from "./parseTemplates.js";
import { ratioThresholdRoutes } from "./ratioThresholds.js";
import { formulaTemplateRoutes } from "./formulaTemplates.js";
import { enumRoutes } from "./enums.js";
import { exclusionRoutes } from "./exclusions.js";
import { quickFormulaRoutes } from "./quickFormulas.js";
import { roleRoutes } from "./roles.js";
import { permissionRoutes } from "./permissions.js";
import { userRoutes } from "./users.js";
import { dbRoutes } from "./db.js";
import nutritionSourceRoutes from "./nutritionSource.js";
import nutritionSourceBatchRoutes from "./nutritionSourceBatch.js";

export function createAppRouter(): Router {
  const router = Router();

  router.use("/auth", authRoutes);
  router.use("/materials", materialRoutes);
  router.use("/formulas", formulaRoutes);
  router.use("/salesmen", salesmanRoutes);
  router.use("/versions", versionRoutes);
  router.use("/exports", exportRoutes);
  router.use("/nutrition", nutritionRoutes);
  router.use("/nutrition", nutritionSourceRoutes);
  router.use("/nutrition", nutritionSourceBatchRoutes);
  router.use("/import", excelImportRoutes);
  router.use("/ai", aiRoutes);
  router.use("/agent", agentRouter);
  router.use("/weather", weatherRoutes);
  router.use("/sales", salesRoutes);
  router.use("/reports", reportRoutes);
  router.use("/dashboard", dashboardRoutes);
  router.use("/parse-templates", parseTemplateRoutes);
  router.use("/ratio-thresholds", ratioThresholdRoutes);
  router.use("/formula-templates", formulaTemplateRoutes);
  router.use("/enums/exclusions", exclusionRoutes);
  router.use("/enums", enumRoutes);
  router.use("/quick-formulas", quickFormulaRoutes);
  router.use("/roles", roleRoutes);
  router.use("/permissions", permissionRoutes);
  router.use("/users", userRoutes);
  router.use("/db", dbRoutes);

  return router;
}
