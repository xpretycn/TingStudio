import { Router } from "express";
import { authMiddleware } from "../middleware/auth.js";
import {
  getDashboardStats,
  getRecentActivity,
  getSalesTrend
} from "../controllers/dashboardController.js";

const router = Router();

// 所有路由都需要认证
router.use(authMiddleware);

// Dashboard 数据概览
router.get("/stats", getDashboardStats);
router.get("/activity", getRecentActivity);
router.get("/sales-trend", getSalesTrend);

export const dashboardRoutes = router;
